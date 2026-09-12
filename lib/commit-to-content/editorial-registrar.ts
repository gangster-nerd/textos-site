// Enregistrement STRICT des candidats éditoriaux — CTC-7.
//
// Aucun fallback silencieux. Chaque fichier sous editorial/ doit porter un frontmatter
// conforme à `EditorialFrontmatterSchema`. Frontmatter malformé → erreur explicite au sync.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { sha256Hex } from "./editorial-verifier";
import {
  EditorialFrontmatterSchema,
  type EditorialFrontmatter,
} from "./editorial-frontmatter";
import type { EditorialCandidate } from "./types";

export interface RegistrarFailure {
  path: string;
  message: string;
}

export function scanEditorialCandidates(args: {
  bundleDir: string;
}): { candidates: EditorialCandidate[]; failures: RegistrarFailure[] } {
  const editorialDir = path.join(args.bundleDir, "editorial");
  const candidates: EditorialCandidate[] = [];
  const failures: RegistrarFailure[] = [];
  if (!existsSync(editorialDir)) return { candidates, failures };
  const walk = (abs: string, rel: string) => {
    for (const name of readdirSync(abs).sort()) {
      const nextAbs = path.join(abs, name);
      const nextRel = path.join(rel, name);
      if (statSync(nextAbs).isDirectory()) {
        walk(nextAbs, nextRel);
        continue;
      }
      if (name === "README.md") continue;
      if (!name.endsWith(".md")) continue;
      const contents = readFileSync(nextAbs, "utf8");
      const raw = parseFrontmatterRaw(contents);
      const parsed = EditorialFrontmatterSchema.safeParse(raw);
      if (!parsed.success) {
        failures.push({
          path: nextRel,
          message: `Frontmatter invalide : ${parsed.error.issues
            .map((i) => `${i.path.join(".") || "(racine)"}: ${i.message}`)
            .join(" • ")}`,
        });
        continue;
      }
      const front: EditorialFrontmatter = parsed.data;
      candidates.push({
        path: nextRel,
        sha256: sha256Hex(contents),
        surface: front.surface,
        classification: front.classification,
        sourceProductRef: front.sourceProductRef,
        truthLevel: front.truthLevel,
        basisCapabilityIds: front.basisCapabilities,
        basisClaimIds: front.basisClaimIds,
        disclosureAuthority: front.disclosureAuthority,
        proposedPublishability: front.proposedPublishability,
        language: front.language,
        humanReviewRequired: front.humanReviewRequired,
      });
    }
  };
  walk(editorialDir, "editorial");
  return {
    candidates: candidates.sort((a, b) => a.path.localeCompare(b.path)),
    failures,
  };
}

// Parseur YAML minimaliste — scalaires, listes, booléens. Renvoie une valeur non-typée que le
// schéma Zod validera strictement.
export function parseFrontmatterRaw(contents: string): Record<string, unknown> {
  const match = contents.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const out: Record<string, unknown> = {};
  let currentKey: string | null = null;
  let listBuf: string[] = [];
  const flush = () => {
    if (currentKey !== null) {
      out[currentKey] = [...listBuf];
      listBuf = [];
      currentKey = null;
    }
  };
  for (const raw of match[1].split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (line === "") continue;
    const scalar = line.match(/^([a-zA-Z0-9_]+)\s*:\s*(.+)$/);
    const emptyKey = line.match(/^([a-zA-Z0-9_]+)\s*:\s*$/);
    const item = line.match(/^\s+-\s*(.+)$/);
    if (scalar) {
      flush();
      const raw = scalar[2].replace(/^"|"$/g, "");
      // Reconnaissance des listes inline `[]` (empty) ou `[a, b]` (short-form). Le reste
      // reste du scalaire coerced.
      if (raw === "[]") {
        out[scalar[1]] = [];
      } else if (raw.startsWith("[") && raw.endsWith("]")) {
        out[scalar[1]] = raw
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim().replace(/^"|"$/g, ""))
          .filter((s) => s.length > 0);
      } else {
        out[scalar[1]] = coerce(raw);
      }
    } else if (emptyKey) {
      flush();
      currentKey = emptyKey[1];
    } else if (item && currentKey) {
      listBuf.push(item[1].replace(/^"|"$/g, ""));
    }
  }
  flush();
  return out;
}

function coerce(v: string): string | boolean {
  if (v === "true") return true;
  if (v === "false") return false;
  return v;
}
