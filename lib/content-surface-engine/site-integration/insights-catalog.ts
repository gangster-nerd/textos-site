// CTC-CSE-CONVERGENCE-1 — bridge for the 12 managed-corpus insight documents.
//
// The 12 articles migrated by A3 live at content/managed-corpus/*.json as validated
// ContentDocuments. This catalog surfaces them to the textos-site route layer WITHOUT
// re-introducing a competing composition engine — it is a thin lookup that hands each
// document to `resolveContentSurface()` at render time, just like preview-catalog does for
// SURFACE_PASS fixtures.
//
// SurfacePolicy owns visibility. This catalog only decides which documents *exist* in the
// insight surface (all 12 unconditionally; policy layer then hides/shows in Production
// vs Preview).

import type { ContentDocument } from "../contract/content-document";
import { loadManagedCorpus } from "../conformance/corpus-loader";

export interface InsightEntry {
  slug: string;
  document: ContentDocument;
  kicker: string;
}

let cache: readonly InsightEntry[] | null = null;

function build(): readonly InsightEntry[] {
  if (cache) return cache;
  const docs = loadManagedCorpus();
  cache = docs.map((document) => ({
    slug: document.identity.slug,
    document,
    kicker: kickerFor(document),
  }));
  return cache;
}

// Kicker string surfaced above the title. Drawn from the truth vocabulary the producer
// stamped on the document (editorial class or governance stamp). Never invented — if the
// producer did not stamp one, the kicker falls back to the neutral contentType.
function kickerFor(doc: ContentDocument): string {
  const source = doc.truth.sourceStatus.split(":")[0]?.replace(/_/g, " ").toLowerCase() ?? "";
  if (source) return source;
  return doc.identity.contentType;
}

export function listInsightSlugs(): readonly string[] {
  return build().map((e) => e.slug);
}

export function findInsightEntry(slug: string): InsightEntry | undefined {
  return build().find((e) => e.slug === slug);
}

export function listInsightEntries(): readonly InsightEntry[] {
  return build();
}
