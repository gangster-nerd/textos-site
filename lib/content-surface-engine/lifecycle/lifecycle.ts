// A3 — lifecycle / freshness (existing signals only).
//
// State machine derived STRICTLY from already-governed identities:
//   - sourceEvidenceDigest (or sourceSha) — has the source changed?
//   - sourceStatus / editorial-maturity string — has product-side maturity moved?
//   - lastReviewedAt — is the document overdue for review under policy?
//
// Never invented: no traffic signals, no ranking signals, no engagement events, no CTR, no
// "content stale after N days without visits". The mission requires this to remain
// deterministic and free of runtime observation.
//
// Editorial `updatedAt` MUST NOT change for:
//   - renderer version upgrade
//   - SurfacePolicy version upgrade
//   - CSS / theme change
//   - metadata compiler refactor
//   - LinkGraph recalculation alone
//   - deployment alone
//
// The `updatedAt` field is editorial truth carried by the document; this module never mutates
// documents. It only REPORTS a lifecycle state derived from digest / status inputs.

import type { ContentDocument } from "../contract/content-document";

export type LifecycleState =
  | "CURRENT"
  | "SOURCE_CHANGED"
  | "MATURITY_CHANGED"
  | "NEEDS_REVIEW";

export interface LifecycleEvaluation {
  documentId: string;
  state: LifecycleState;
  reasons: readonly string[];
  // The set of digest/status identities the evaluation depends on. Consumers may fingerprint
  // this to cache lifecycle decisions without re-reading the document.
  inputs: {
    sourceEvidenceDigest: string | null;
    sourceSha: string | null;
    sourceStatus: string;
    lastReviewedAt: string | null;
  };
}

export interface EvaluateLifecycleInput {
  document: ContentDocument;
  // Optional previously-observed identities to compare against. When absent (no history)
  // the state is CURRENT provided no NEEDS_REVIEW rule fires.
  previous?: {
    sourceEvidenceDigest?: string;
    sourceSha?: string;
    sourceStatus?: string;
  };
  // Deterministic "now" for review-window checks. Callers pass a synthetic date in tests.
  now?: Date;
  // Days after `lastReviewedAt` before NEEDS_REVIEW fires. `null` disables the check.
  reviewWindowDays?: number | null;
}

function daysBetween(a: Date, b: Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.floor((a.getTime() - b.getTime()) / MS_PER_DAY);
}

export function evaluateLifecycle(input: EvaluateLifecycleInput): LifecycleEvaluation {
  const { document } = input;
  const reasons: string[] = [];
  const inputs: LifecycleEvaluation["inputs"] = {
    sourceEvidenceDigest: document.provenance.sourceEvidenceDigest ?? null,
    sourceSha: document.provenance.sourceSha ?? null,
    sourceStatus: document.truth.sourceStatus,
    lastReviewedAt: document.lifecycle.lastReviewedAt ?? null,
  };

  let state: LifecycleState = "CURRENT";

  const prev = input.previous;
  if (prev) {
    if (
      prev.sourceEvidenceDigest !== undefined
      && inputs.sourceEvidenceDigest !== null
      && prev.sourceEvidenceDigest !== inputs.sourceEvidenceDigest
    ) {
      state = "SOURCE_CHANGED";
      reasons.push("sourceEvidenceDigest differs from previous observation");
    }
    if (
      prev.sourceSha !== undefined
      && inputs.sourceSha !== null
      && prev.sourceSha !== inputs.sourceSha
    ) {
      state = "SOURCE_CHANGED";
      reasons.push("sourceSha differs from previous observation");
    }
    if (
      prev.sourceStatus !== undefined
      && prev.sourceStatus !== inputs.sourceStatus
    ) {
      // Maturity-only change takes precedence over CURRENT but not over SOURCE_CHANGED
      // (source change implies the maturity metadata came with it).
      if (state === "CURRENT") state = "MATURITY_CHANGED";
      reasons.push("sourceStatus vocabulary changed");
    }
  }

  const reviewWindow = input.reviewWindowDays ?? null;
  if (reviewWindow !== null && inputs.lastReviewedAt) {
    const now = input.now ?? new Date();
    const reviewed = new Date(inputs.lastReviewedAt + "T00:00:00Z");
    const age = daysBetween(now, reviewed);
    if (age > reviewWindow) {
      state = "NEEDS_REVIEW";
      reasons.push(`lastReviewedAt is ${age}d old (window ${reviewWindow}d).`);
    }
  }

  return { documentId: document.identity.documentId, state, reasons, inputs };
}
