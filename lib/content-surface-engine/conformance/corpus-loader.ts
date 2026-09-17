// A3 — corpus loader for the 12 migrated TextOS insight documents.
//
// Loads JSON documents from `content/managed-corpus/*.json` at build time. Files are checked
// in as JSON: neither markdown nor the migration script is a runtime dependency. Every entry
// is validated through the shared ContentDocumentSchema — a malformed corpus fails at
// module load.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import type { ContentDocument } from "../contract/content-document";
import { ContentDocumentSchema } from "../contract/content-document";

const CORPUS_DIR = path.resolve(process.cwd(), "content/managed-corpus");

interface CorpusInventoryEntry {
  slug: string;
  path: string;
  sha256: string;
}

export interface CorpusInventory {
  migratedAt: string;
  sourceBranch: string;
  entries: readonly CorpusInventoryEntry[];
}

let cache: readonly ContentDocument[] | null = null;

export function loadManagedCorpus(): readonly ContentDocument[] {
  if (cache) return cache;
  const files = readdirSync(CORPUS_DIR)
    .filter(
      (f) =>
        f.endsWith(".json") &&
        !f.startsWith("A3-") &&
        !f.startsWith("A3R-") &&
        f !== "INVENTORY.json",
    )
    .sort();
  cache = files.map((filename) => {
    const raw = JSON.parse(readFileSync(path.join(CORPUS_DIR, filename), "utf8"));
    return ContentDocumentSchema.parse(raw);
  });
  return cache;
}

export function loadCorpusInventory(): CorpusInventory {
  const raw = JSON.parse(readFileSync(path.join(CORPUS_DIR, "INVENTORY.json"), "utf8"));
  return raw as CorpusInventory;
}
