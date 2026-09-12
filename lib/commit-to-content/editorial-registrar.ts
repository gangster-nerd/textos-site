// Enregistrement des candidats éditoriaux présents sous editorial/.
//
// Le contenu est AUTHORED par l'opérateur (agent Claude Code local). Ce module :
//   - scanne editorial/ ;
//   - lit chaque fichier ;
//   - calcule sha256 ;
//   - parse le frontmatter pour capabilityIds, claimIds, classification, etc. ;
//   - retourne EditorialCandidate[].
//
// Le résultat est intégré à bundle.json. Toute modification ultérieure des fichiers changera
// le hash et fera échouer `content:verify` — c'est la garantie de provenance CTC-6.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { sha256Hex } from "./editorial-verifier";
import type {
  EditorialCandidate,
  PublishabilityStatus,
  TruthLevel,
} from "./types";

export function scanEditorialCandidates(args: {
  bundleDir: string;
  fallbackSourceRef: string;
  fallbackTruthLevel: TruthLevel;
}): EditorialCandidate[] {
  const editorialDir = path.join(args.bundleDir, "editorial");
  if (!existsSync(editorialDir)) return [];
  const out: EditorialCandidate[] = [];
  const walk = (abs: string, rel: string) => {
    for (const name of readdirSync(abs).sort()) {
      const nextAbs = path.join(abs, name);
      const nextRel = path.join(rel, name);
      if (statSync(nextAbs).isDirectory()) {
        walk(nextAbs, nextRel);
        continue;
      }
      if (name === "README.md") continue; // documentaire uniquement
      if (!name.endsWith(".md")) continue;
      const contents = readFileSync(nextAbs, "utf8");
      const front = parseFrontmatter(contents);
      out.push({
        path: nextRel,
        sha256: sha256Hex(contents),
        surface: (front.surface as string) ?? inferSurfaceFromFilename(name),
        classification:
          (front.classification as EditorialCandidate["classification"]) ?? "COPY_CLARIFICATION",
        sourceProductRef: (front.sourceProductRef as string) ?? args.fallbackSourceRef,
        truthLevel: (front.truthLevel as TruthLevel) ?? args.fallbackTruthLevel,
        basisCapabilityIds: parseYamlList(front.basisCapabilities) ?? parseYamlList(front.basisCapabilityIds) ?? [],
        basisClaimIds: parseYamlList(front.basisClaimIds) ?? parseYamlList(front.basisClaims) ?? [],
        disclosureAuthority: (front.disclosureAuthority as string) ?? "IMPLICIT_MANIFEST_MARKETABLE",
        proposedPublishability:
          (front.proposedPublishability as PublishabilityStatus) ?? "REQUIRES_HUMAN_REVIEW",
        language: (front.language as "en" | "fr") ?? inferLanguage(contents),
        humanReviewRequired:
          front.humanReviewRequired === "false" ? false : true,
      });
    }
  };
  walk(editorialDir, "editorial");
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

function inferSurfaceFromFilename(name: string): string {
  return name.replace(/\.md$/, "").replace(/-.*$/, "");
}

function inferLanguage(contents: string): "en" | "fr" {
  // Heuristique : présence de mots-outils français typiques → fr, sinon en.
  const fr = /\b(le|la|les|des|une|dans|pour|sans|avec|également|voici)\b/i.test(contents);
  return fr ? "fr" : "en";
}

function parseFrontmatter(contents: string): Record<string, string | string[] | undefined> {
  const match = contents.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const out: Record<string, string | string[]> = {};
  let currentKey: string | null = null;
  const listBuf: string[] = [];
  const lines = match[1].split("\n");
  const flush = () => {
    if (currentKey && listBuf.length > 0) {
      out[currentKey] = [...listBuf];
      listBuf.length = 0;
    }
  };
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    const scalar = line.match(/^([a-zA-Z0-9_]+)\s*:\s*(.+)$/);
    const key = line.match(/^([a-zA-Z0-9_]+)\s*:\s*$/);
    const item = line.match(/^\s+-\s*(.+)$/);
    if (scalar) {
      flush();
      currentKey = null;
      out[scalar[1]] = scalar[2].replace(/^"|"$/g, "");
    } else if (key) {
      flush();
      currentKey = key[1];
    } else if (item && currentKey) {
      listBuf.push(item[1].replace(/^"|"$/g, ""));
    }
  }
  flush();
  return out;
}

function parseYamlList(value: string | string[] | undefined): string[] | undefined {
  if (Array.isArray(value)) return value;
  return undefined;
}
