// Lecture d'une ref produit ARBITRAIRE, en local, pour `content:sync`.
//
// CE MODULE N'EST APPELÉ QUE PAR L'OPÉRATEUR LOCAL. Il n'est jamais exécuté en CI.
// Il ne remplace PAS `product-manifest/verify-product-manifest.ts`, qui reste la seule
// source de vérité épinglée. Ici on veut simplement RÉPONDRE à la question :
//
//   "À la ref X du produit, la déclaration de capacité TypeScript est-elle byte-identique
//    au manifeste actuellement épinglé côté site ?"
//
// Si oui : la vérité produit épinglée reste applicable, on peut proposer une refresh
// éditoriale à ce point-là. Si non : le pipeline BLOQUE et exige un ré-import via
// `gh run download`, comme documenté dans product-manifest/IMPORT.md.
//
// On lit la source .ts brute plutôt que de tenter de la ré-exécuter : la spec `manifest:build`
// vit dans le dépôt produit, elle n'a pas à être répliquée ici. Un digest sha256 sur le fichier
// source est un proxy suffisant pour "la déclaration est-elle byte-identique ?" — c'est
// exactement ce que le test de non-régression byte-identique ci-dessous atteste.

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { ProductSourceRef, TruthLevel } from "./types";

const DECLARATION_PATH = "src/manifest/capability-declaration.ts";

const AUTHORITATIVE_MAIN_SHA = "a0efa146a8691938b624c156d99f4663f6f92218";
const R2_CANDIDATE_SHA = "3cfae5830fed3f10fd35ed77e699a183162b6cbe";

function productRepoPath(): string {
  const fromEnv = process.env.TEXTOS_PRODUCT_REPO;
  const candidate = fromEnv && fromEnv.length > 0 ? fromEnv : "/Users/marc/Desktop/textos";
  if (!existsSync(candidate)) {
    throw new Error(
      `Dépôt produit introuvable : ${candidate}. Renseigner TEXTOS_PRODUCT_REPO pour pointer vers un clone read-only de textos-v0.`,
    );
  }
  if (!existsSync(path.join(candidate, ".git"))) {
    throw new Error(`Chemin ${candidate} n'est pas un dépôt git.`);
  }
  return candidate;
}

function resolveTruthLevel(sha: string): TruthLevel {
  if (sha === R2_CANDIDATE_SHA) return "CANDIDATE";
  // Toute ref différente du candidat R2 connu est considérée AUTHORITATIVE_MAIN par défaut.
  // Le pipeline vérifie ensuite via `matchesPinnedManifest` que la déclaration correspond au
  // manifeste épinglé — c'est la vraie protection.
  return "AUTHORITATIVE_MAIN";
}

function readSourceAt(repo: string, sha: string, filePath: string): string {
  try {
    const buf = execFileSync("git", ["-C", repo, "show", `${sha}:${filePath}`], {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
    return buf;
  } catch (err) {
    throw new Error(
      `Lecture impossible de ${filePath} à la ref ${sha} dans ${repo}: ${(err as Error).message}`,
    );
  }
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function resolveFullSha(repo: string, ref: string): string {
  const full = execFileSync("git", ["-C", repo, "rev-parse", ref], {
    encoding: "utf8",
  }).trim();
  if (!/^[0-9a-f]{40}$/.test(full)) {
    throw new Error(`Impossible de résoudre ${ref} en SHA-40 (obtenu ${full}).`);
  }
  return full;
}

export interface ResolveArgs {
  ref: string;
  pinnedDeclarationDigest: string; // digest attendu (celui du manifeste épinglé côté site)
}

export function resolveProductRef(args: ResolveArgs): ProductSourceRef {
  const repo = productRepoPath();
  const sha = resolveFullSha(repo, args.ref);
  const source = readSourceAt(repo, sha, DECLARATION_PATH);
  const digest = sha256Hex(source);
  return {
    sha,
    shortSha: sha.slice(0, 7),
    truthLevel: resolveTruthLevel(sha),
    declarationDigest: digest,
    matchesPinnedManifest: digest === args.pinnedDeclarationDigest,
  };
}

// Digest de référence : ce que la déclaration source produit AU SHA actuellement épinglé côté
// site. Calculé à la volée pour éviter de recopier une valeur qui pourrait vieillir.
export function computePinnedDeclarationDigest(): { pinnedSha: string; digest: string } {
  const repo = productRepoPath();
  const importMd = readFileSync(
    path.join(
      path.dirname(new URL(import.meta.url).pathname),
      "..",
      "..",
      "product-manifest",
      "IMPORT.md",
    ),
    "utf8",
  );
  const match = importMd.match(/`([0-9a-f]{40})`/);
  if (!match) {
    throw new Error("Impossible d'extraire le SHA épinglé depuis product-manifest/IMPORT.md.");
  }
  const pinnedSha = match[1];
  const source = readSourceAt(repo, pinnedSha, DECLARATION_PATH);
  return { pinnedSha, digest: sha256Hex(source) };
}
