// A2R-PORT — related-content resolution.
//
// Turns the resolved surface's `relatedContentIds` into presentation objects
// (title + description + href + isDraft) by looking each id up in the managed
// corpus catalog. If explicit related ids are absent, we score against the rest
// of the corpus using topic + claim + capability overlap (deterministic, matches
// the PR #19 scoreRelated shape but sourced from ContentDocument).
//
// Empty result on a document whose surface policy requires the related slot is
// a TEST failure — never a silent empty render.

import type { ContentDocument } from "../contract/content-document";
import { listInsightEntries } from "./insights-catalog";

export interface ResolvedRelatedEntry {
  documentId: string;
  slug: string;
  title: string;
  description: string;
  href: string;
  isDraft: boolean;
  reasons: readonly string[];
  score: number;
}

interface Options {
  target: ContentDocument;
  /** If true, exclude drafts (used for indexable/public Production). */
  publicOnly?: boolean;
  /** Cap on results. */
  limit?: number;
}

export function resolveRelatedContent(opts: Options): ResolvedRelatedEntry[] {
  const catalog = listInsightEntries();
  const targetId = opts.target.identity.documentId;
  const explicit = new Set(opts.target.relationships.relatedContentIds ?? []);
  const primaryTopic = opts.target.editorial.primaryTopicId;
  const targetTopics = new Set(opts.target.editorial.topicIds ?? []);
  const targetClaims = new Set(opts.target.truth.claimIds ?? []);
  const targetCaps = new Set(opts.target.truth.capabilityIds ?? []);

  const scored: ResolvedRelatedEntry[] = [];
  for (const entry of catalog) {
    if (entry.document.identity.documentId === targetId) continue;
    const d = entry.document;
    const isDraft = d.truth.publicationStatus !== "published";
    if (opts.publicOnly && isDraft) continue;

    let score = 0;
    const reasons: string[] = [];

    if (explicit.has(d.identity.documentId)) {
      score += 50;
      reasons.push("explicit relation");
    }
    if (primaryTopic && d.editorial.primaryTopicId === primaryTopic) {
      score += 15;
      reasons.push("shared primary topic");
    }
    let topicOverlap = 0;
    for (const t of d.editorial.topicIds ?? []) {
      if (targetTopics.has(t)) topicOverlap += 1;
    }
    if (topicOverlap > 0) {
      score += topicOverlap * 5;
      reasons.push(`${topicOverlap} shared topic${topicOverlap > 1 ? "s" : ""}`);
    }
    let capOverlap = 0;
    for (const c of d.truth.capabilityIds ?? []) {
      if (targetCaps.has(c)) capOverlap += 1;
    }
    if (capOverlap > 0) {
      score += capOverlap * 10;
      reasons.push(`${capOverlap} shared capability${capOverlap > 1 ? "ies" : ""}`);
    }
    let claimOverlap = 0;
    for (const c of d.truth.claimIds ?? []) {
      if (targetClaims.has(c)) claimOverlap += 1;
    }
    if (claimOverlap > 0) {
      score += claimOverlap * 6;
      reasons.push(`${claimOverlap} shared claim${claimOverlap > 1 ? "s" : ""}`);
    }

    if (score === 0) continue;

    scored.push({
      documentId: d.identity.documentId,
      slug: d.identity.slug,
      title: d.identity.title,
      description: d.identity.description,
      href: `/insights/${d.identity.slug}`,
      isDraft,
      reasons,
      score,
    });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.slug.localeCompare(b.slug);
  });

  const limit = opts.limit ?? 6;
  return scored.slice(0, limit);
}
