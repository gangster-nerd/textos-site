#!/usr/bin/env tsx
// Utilitaire ponctuel : calcule sha256 pour chaque sourcePath d'un fichier briefs.json,
// lu au SHA autoritatif via `git show`. Écrit le résultat en place.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const REPO = process.env.TEXTOS_PRODUCT_REPO ?? "/Users/marc/Desktop/textos";
const SHA = "a0efa146a8691938b624c156d99f4663f6f92218";

const target = process.argv[2] ?? "content-bundles/corpus-inventory/authoritative-a0efa14/briefs.json";
const abs = path.resolve(target);
const doc = JSON.parse(readFileSync(abs, "utf8")) as {
  sourceProductRef: string;
  briefs: Array<{ sourcePaths: string[]; sourceDigests?: Record<string, string> }>;
};

const cache = new Map<string, string>();
function digest(p: string): string {
  const cached = cache.get(p);
  if (cached) return cached;
  try {
    const buf = execFileSync("git", ["-C", REPO, "show", `${SHA}:${p}`]);
    const h = createHash("sha256").update(buf).digest("hex");
    cache.set(p, h);
    return h;
  } catch {
    cache.set(p, "MISSING_AT_SHA");
    return "MISSING_AT_SHA";
  }
}

for (const brief of doc.briefs) {
  const digests: Record<string, string> = {};
  for (const p of brief.sourcePaths) digests[p] = digest(p);
  brief.sourceDigests = digests;
}

writeFileSync(abs, JSON.stringify(doc, null, 2) + "\n", "utf8");
console.log(`[corpus-digest] ${doc.briefs.length} briefs · ${cache.size} unique paths hashed at ${SHA}`);
