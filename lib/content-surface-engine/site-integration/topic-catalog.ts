// A3R §7 — governed topic catalog derived from the ContentDocument corpus.
//
// The topic taxonomy is authored producer-side (`editorial.primaryTopicId` +
// `editorial.topicIds`). This module lists every topic id the current corpus
// declares, plus a resolver that surfaces the documents attached to a given
// topic. NO invented topic ; no fabricated taxonomy.

import type { ContentDocument } from "../contract/content-document";
import { listInsightEntries } from "./insights-catalog";

export interface TopicSummary {
  slug: string;
  documentIds: readonly string[];
  primaryDocumentIds: readonly string[];
}

/** All topic slugs present in the corpus (declared by ≥1 governed doc). */
export function listGovernedTopics(): readonly TopicSummary[] {
  const entries = listInsightEntries();
  const bySlug = new Map<
    string,
    { documentIds: Set<string>; primaryDocumentIds: Set<string> }
  >();
  for (const e of entries) {
    const primary = e.document.editorial.primaryTopicId;
    for (const t of e.document.editorial.topicIds ?? []) {
      let entry = bySlug.get(t);
      if (!entry) {
        entry = { documentIds: new Set(), primaryDocumentIds: new Set() };
        bySlug.set(t, entry);
      }
      entry.documentIds.add(e.document.identity.documentId);
      if (primary === t) entry.primaryDocumentIds.add(e.document.identity.documentId);
    }
  }
  return [...bySlug.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slug, sets]) => ({
      slug,
      documentIds: [...sets.documentIds].sort(),
      primaryDocumentIds: [...sets.primaryDocumentIds].sort(),
    }));
}

/** Documents attached to `topicSlug`. */
export function documentsForTopic(topicSlug: string): readonly ContentDocument[] {
  const entries = listInsightEntries();
  return entries
    .filter((e) => (e.document.editorial.topicIds ?? []).includes(topicSlug))
    .map((e) => e.document);
}

/** Public-eligible documents for a topic ; only ids that are in the indexable set. */
export function publicDocumentsForTopic(
  topicSlug: string,
  indexableIds: ReadonlySet<string>,
): readonly ContentDocument[] {
  return documentsForTopic(topicSlug).filter((d) =>
    indexableIds.has(d.identity.documentId),
  );
}
