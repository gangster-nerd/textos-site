// Vérificateur éditorial déterministe — CTC-6.
//
// Un candidat éditorial est GOUVERNÉ par le bundle : son sha256 + frontmatter sont enregistrés
// dans `bundle.json.editorialCandidates`. Toute divergence (fichier absent, hash divergent,
// fichier orphelin sous editorial/, capacité inconnue, claim non autorisé pour la surface,
// mention interdite) échoue `content:verify`.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { CLAIMS, type Claim } from "@/lib/claims-registry";
import { CAPABILITY_REGISTRY, findCapability } from "@/lib/capability-registry";
import type { PublicSurface } from "@/lib/product-manifest/status-axes";

import type { EditorialCandidate } from "./types";

const HOMEPAGE_FORBIDDEN_TOKENS = ["commit to content"];
const FAQ_FORBIDDEN_TOKENS = ["commit to content"];
const SELF_SERVE_TOKENS = [
  "sign up",
  "start now",
  "start for free",
  "self-serve",
  "self serve",
  "try it now",
];

// Correspondance entre la surface éditoriale du bundle et la surface publique du registre.
const EDITORIAL_TO_PUBLIC_SURFACE: Record<string, PublicSurface> = {
  // homepage → sales_copy : la homepage porte des claims sales_copy (cta-registry.ts). Les
  // claims capacitaires (observe-authority-presence) sont testés sur `homepage`.
  homepage: "sales_copy",
  product_proof: "sales_copy",
  faq: "faq",
  methodology: "product_article",
  labs: "developer_note",
};

export interface EditorialVerifierInput {
  bundleDir: string;
  editorialCandidates: EditorialCandidate[];
  selfServeEligible: boolean;
}

export interface EditorialVerifierFailure {
  editorial: string | null;
  message: string;
}

export function verifyEditorialCandidates(
  input: EditorialVerifierInput,
): EditorialVerifierFailure[] {
  const failures: EditorialVerifierFailure[] = [];

  // 1. Fichiers référencés existent + hash correct + frontmatter cohérent.
  const referencedPaths = new Set<string>();
  for (const c of input.editorialCandidates) {
    referencedPaths.add(c.path);
    const abs = path.join(input.bundleDir, c.path);
    if (!existsSync(abs)) {
      failures.push({ editorial: c.path, message: `Fichier absent : ${c.path}.` });
      continue;
    }
    const contents = readFileSync(abs, "utf8");
    const digest = sha256Hex(contents);
    if (digest !== c.sha256) {
      failures.push({
        editorial: c.path,
        message: `Hash divergent : attendu ${c.sha256}, obtenu ${digest}. Le fichier a été modifié après régénération du bundle.`,
      });
      continue;
    }
    const frontmatter = parseFrontmatter(contents);
    // sourceProductRef doit matcher
    if (frontmatter.sourceProductRef && frontmatter.sourceProductRef !== c.sourceProductRef) {
      failures.push({
        editorial: c.path,
        message: `frontmatter.sourceProductRef=${frontmatter.sourceProductRef} ≠ candidate.sourceProductRef=${c.sourceProductRef}.`,
      });
    }
    if (frontmatter.truthLevel && frontmatter.truthLevel !== c.truthLevel) {
      failures.push({
        editorial: c.path,
        message: `frontmatter.truthLevel=${frontmatter.truthLevel} ≠ candidate.truthLevel=${c.truthLevel}.`,
      });
    }
    // basisCapabilityIds : chaque id doit exister dans le registre ET autoriser la surface.
    const targetSurface = EDITORIAL_TO_PUBLIC_SURFACE[c.surface];
    for (const cap of c.basisCapabilityIds) {
      const entry = findCapability(cap);
      if (!entry) {
        failures.push({
          editorial: c.path,
          message: `basisCapabilityId inconnue : ${cap}.`,
        });
        continue;
      }
      if (targetSurface && !entry.claimedSurfaces.includes(targetSurface)) {
        failures.push({
          editorial: c.path,
          message: `capability ${cap} ne revendique pas la surface ${targetSurface} pour l'éditorial ${c.surface}.`,
        });
      }
    }
    // basisClaimIds : chaque id doit exister ET autoriser la surface.
    for (const cid of c.basisClaimIds) {
      const claim = (CLAIMS as readonly Claim[]).find((x) => x.id === cid);
      if (!claim) {
        failures.push({
          editorial: c.path,
          message: `basisClaimId inconnu : ${cid}.`,
        });
        continue;
      }
      if (
        targetSurface &&
        !(claim.allowedSurfaces as readonly string[]).includes(targetSurface)
      ) {
        failures.push({
          editorial: c.path,
          message: `claim ${cid} non autorisé sur surface ${targetSurface}.`,
        });
      }
    }
    // Termes bannis par surface.
    const lower = contents.toLowerCase();
    const bannedForSurface =
      c.surface === "homepage"
        ? HOMEPAGE_FORBIDDEN_TOKENS
        : c.surface === "faq"
          ? FAQ_FORBIDDEN_TOKENS
          : [];
    // On isole le CORPS (hors frontmatter et hors "banned words section" documentaire) :
    // approximation minimaliste — on regarde tout le fichier mais on écarte les usages
    // meta évidents. Ici : si le fichier est le candidat "commit-to-content-technology-story",
    // le token est autorisé.
    if (
      !c.path.includes("commit-to-content-technology-story") &&
      c.surface !== "labs"
    ) {
      for (const token of bannedForSurface) {
        if (lower.includes(token)) {
          failures.push({
            editorial: c.path,
            message: `Terme interdit "${token}" présent en surface ${c.surface}.`,
          });
        }
      }
    }
    // Self-serve wording quand eligibility=false : rejet.
    if (!input.selfServeEligible) {
      for (const token of SELF_SERVE_TOKENS) {
        if (lower.includes(token)) {
          failures.push({
            editorial: c.path,
            message: `Terme self-serve "${token}" détecté alors que selfServeEligible=false.`,
          });
        }
      }
    }
  }

  // 2. Aucun fichier orphelin sous editorial/ (hors README.md).
  const editorialDir = path.join(input.bundleDir, "editorial");
  if (existsSync(editorialDir)) {
    const walk = (abs: string, rel: string) => {
      for (const name of readdirSync(abs)) {
        const nextAbs = path.join(abs, name);
        const nextRel = path.join(rel, name);
        if (statSync(nextAbs).isDirectory()) {
          walk(nextAbs, nextRel);
          continue;
        }
        if (name === "README.md") continue; // documentaire, jamais gouverné par bundle
        if (!referencedPaths.has(nextRel)) {
          failures.push({
            editorial: nextRel,
            message: `Fichier éditorial orphelin : présent sur disque, non référencé dans bundle.editorialCandidates.`,
          });
        }
      }
    };
    walk(editorialDir, "editorial");
  }

  return failures;
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function parseFrontmatter(contents: string): Record<string, string> {
  const match = contents.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const out: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^([a-zA-Z0-9_]+)\s*:\s*(.+?)\s*$/);
    if (kv) out[kv[1]] = kv[2].replace(/^"|"$/g, "");
  }
  return out;
}
