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
//
// Commit-to-Content client: the articles TextOS wrote for this site (textos/runs/**) join the
// same catalogue once lib/textos-client has verified their receipts and projected them. A run
// that does not check throws here, at build time.

import type { ContentDocument } from "../contract/content-document";
import { loadManagedCorpus } from "../conformance/corpus-loader";
import { loadCtcArticles } from "@/lib/textos-client/ctc-articles";
import { earlyDisclosureLabel, type EarlyDisclosure } from "@/lib/content/early-disclosure";
import { editorialEyebrowLabel } from "./editorial-eyebrow";

export interface InsightEntry {
  slug: string;
  document: ContentDocument;
  kicker: string;
  /** ADR-034 : la note parle d'une capacité en bêta ou « bientôt » — son label devient le kicker. */
  earlyDisclosure: EarlyDisclosure | null;
}

let cache: readonly InsightEntry[] | null = null;

function build(): readonly InsightEntry[] {
  if (cache) return cache;
  const sources = [
    ...loadManagedCorpus().map((document) => ({ document, earlyDisclosure: null as EarlyDisclosure | null })),
    ...loadCtcArticles().map((a) => ({ document: a.document, earlyDisclosure: a.earlyDisclosure })),
  ];
  const docs = sources.map((source) => source.document);
  const slugs = new Set<string>();
  for (const d of docs) {
    if (slugs.has(d.identity.slug)) throw new Error(`insights-catalog: duplicate slug ${d.identity.slug}.`);
    slugs.add(d.identity.slug);
  }
  cache = sources.map(({ document, earlyDisclosure }) => ({
    slug: document.identity.slug,
    document,
    kicker: earlyDisclosure ? earlyDisclosureLabel(earlyDisclosure.label, document.identity.language) : kickerFor(document),
    earlyDisclosure,
  }));
  return cache;
}

// Kicker string surfaced above the title. Drawn from the truth vocabulary the producer
// stamped on the document (editorial class or governance stamp). Never invented — if the
// producer did not stamp one, the kicker falls back to a translated contentType.
// SNAKE_CASE never reaches the DOM ; see editorial-eyebrow.ts for the reader map.
function kickerFor(doc: ContentDocument): string {
  return editorialEyebrowLabel(doc);
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
