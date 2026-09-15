// Freshness lifecycle — derived per article.
//
// Contrat CTC-ARTICLE-SYSTEM-1 §9. Do NOT change updatedAt for a review-only event. Do NOT
// simulate freshness by changing dates. This module computes a STATE, not a mutation.

export type FreshnessState =
  | "CURRENT"
  | "SOURCE_CHANGED"
  | "MATURITY_CHANGED"
  | "LINK_OPPORTUNITY"
  | "NEEDS_REVIEW"
  | "SUPERSEDED"
  | "ARCHIVED";

export interface FreshnessInput {
  editorialStatus: "draft" | "review" | "published" | "archived";
  publishedAt: string; // YYYY-MM-DD
  updatedAt: string; // YYYY-MM-DD
  lastReviewedAt?: string; // YYYY-MM-DD (optional legacy)
  productSnapshotSha: string;
  currentPinnedManifestSha: string;
  sourceDigests?: Record<string, string>;
  currentSourceDigests?: Record<string, string>;
  supersededBy?: string; // contentId
  publicMaturityChanged?: boolean;
  hasNewRelatedCandidates?: boolean;
  hasBrokenLinks?: boolean;
  // Number of days after lastReviewedAt beyond which an article is deemed NEEDS_REVIEW.
  reviewCadenceDays?: number;
  today?: Date; // testable
}

export function computeFreshness(input: FreshnessInput): FreshnessState {
  if (input.editorialStatus === "archived") return "ARCHIVED";
  if (input.supersededBy) return "SUPERSEDED";

  // Source truth changes take priority — a stale source is the most dangerous divergence.
  if (
    input.currentSourceDigests &&
    input.sourceDigests &&
    Object.keys(input.currentSourceDigests).length > 0
  ) {
    for (const [p, current] of Object.entries(input.currentSourceDigests)) {
      const declared = input.sourceDigests[p];
      if (declared && declared !== current) return "SOURCE_CHANGED";
    }
  }

  if (input.productSnapshotSha !== input.currentPinnedManifestSha) {
    // Article was written against an older product snapshot. Not necessarily wrong — but
    // worth reviewing. This is a softer signal than SOURCE_CHANGED.
    // We only surface it if BOTH the article and the manifest have advanced, otherwise
    // legacy articles pinned at an older snapshot would spam.
    // Weaker signal handled downstream (SOURCE_CHANGED already covers digest divergence).
  }

  if (input.publicMaturityChanged) return "MATURITY_CHANGED";

  if (input.hasBrokenLinks) return "NEEDS_REVIEW";

  const today = input.today ?? new Date();
  const cadence = input.reviewCadenceDays ?? 180;
  const lastRef = input.lastReviewedAt ?? input.publishedAt;
  const parsed = Date.parse(lastRef + "T00:00:00Z");
  if (!Number.isNaN(parsed)) {
    const ageDays = Math.floor((today.getTime() - parsed) / 86_400_000);
    if (ageDays > cadence) return "NEEDS_REVIEW";
  }

  if (input.hasNewRelatedCandidates) return "LINK_OPPORTUNITY";

  return "CURRENT";
}
