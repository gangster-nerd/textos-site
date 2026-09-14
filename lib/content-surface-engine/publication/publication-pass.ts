// A3 — PUBLICATION_PASS.
//
// Evaluates whether a document is ALLOWED to be published on a given surface at this point
// in time. Distinct from CONTENT_PASS (editorial quality) and SURFACE_PASS (rendering
// contract). All three are required for INDEXABLE.
//
// Fail-closed. Publication rights are NEVER inferred from:
//   - Git ancestry
//   - renderer success
//   - schema validity
//   - CONTENT_PASS alone

import type { ContentDocument } from "../contract/content-document";
import type { LifecycleState } from "../lifecycle/lifecycle";
import type { SurfaceKind } from "../contract/content-document";

export type PublicationPassReasonCode =
  | "publication-status-not-publishable"
  | "surface-not-allowed"
  | "source-authority-uncertified"
  | "lifecycle-blocks-publication"
  | "human-review-required"
  | "seo-indexing-intent-forbidden-for-status";

export interface PublicationPassIssue {
  code: PublicationPassReasonCode;
  message: string;
}

export interface PublicationPassResult {
  documentId: string;
  surface: SurfaceKind;
  passed: boolean;
  issues: readonly PublicationPassIssue[];
}

export interface EvaluatePublicationPassInput {
  document: ContentDocument;
  surface: SurfaceKind;
  lifecycleState: LifecycleState;
  // Policy hooks — publication-quality decisions belong to TextOS policy, not to the core.
  // Callers set:
  //   * requireCertifiedSourceWhenGitBacked: when a document declares a sourceSha but its
  //     `sourceAuthority` is UNCERTIFIED, block. Documents without sourceSha (non-Git
  //     producers using sourceEvidenceDigest) are policy-allowed to remain UNCERTIFIED so
  //     long as the caller opts in.
  //   * requireHumanReviewFor: statuses that require an explicit reviewer.
  requireCertifiedSourceForNonGitProducers?: boolean;
  requireHumanReviewFor?: readonly string[];
  // The lifecycle states that block publication.
  blockingLifecycleStates?: readonly LifecycleState[];
}

const DEFAULT_BLOCKING_LIFECYCLE: readonly LifecycleState[] = [
  "SOURCE_CHANGED",
  "MATURITY_CHANGED",
  "NEEDS_REVIEW",
];

export function evaluatePublicationPass(
  input: EvaluatePublicationPassInput,
): PublicationPassResult {
  const { document, surface } = input;
  const issues: PublicationPassIssue[] = [];

  // 1. Publication status must be "published".
  if (document.truth.publicationStatus !== "published") {
    issues.push({
      code: "publication-status-not-publishable",
      message: `publicationStatus="${document.truth.publicationStatus}" is not publishable.`,
    });
  }

  // 2. Surface must be declared allowed.
  if (!document.truth.allowedSurfaces.includes(surface)) {
    issues.push({
      code: "surface-not-allowed",
      message: `surface "${surface}" is not in allowedSurfaces.`,
    });
  }

  // 3. Source authority.
  const auth = document.provenance.sourceAuthority;
  if (document.provenance.sourceSha && auth === "UNCERTIFIED") {
    issues.push({
      code: "source-authority-uncertified",
      message: "sourceSha declared but authority is UNCERTIFIED (not in certified-lineage.json).",
    });
  }
  if (
    !document.provenance.sourceSha
    && auth === "UNCERTIFIED"
    && input.requireCertifiedSourceForNonGitProducers === true
  ) {
    issues.push({
      code: "source-authority-uncertified",
      message: "no sourceSha and non-Git provenance is not policy-allowed on this surface.",
    });
  }
  // A document with sourceEvidenceDigest but no sourceSha (non-Git producer) is UNCERTIFIED
  // by nature. When the policy explicitly permits it, no issue is raised here — the caller
  // is asserting the evidence-digest chain is trusted.

  // 4. Lifecycle blocks publication.
  const blocking = input.blockingLifecycleStates ?? DEFAULT_BLOCKING_LIFECYCLE;
  if (blocking.includes(input.lifecycleState)) {
    issues.push({
      code: "lifecycle-blocks-publication",
      message: `lifecycle state "${input.lifecycleState}" blocks publication.`,
    });
  }

  // 5. Human review requirement.
  const humanReview = input.requireHumanReviewFor ?? [];
  if (humanReview.includes(document.truth.publicationStatus)) {
    issues.push({
      code: "human-review-required",
      message: `publicationStatus="${document.truth.publicationStatus}" requires human review.`,
    });
  }

  // 6. `indexingIntent="index"` on a non-published document is a contradiction that the Zod
  // superRefine already blocks — but PUBLICATION_PASS records it explicitly here for reason
  // codes.
  if (
    document.seo.indexingIntent === "index"
    && document.truth.publicationStatus !== "published"
  ) {
    issues.push({
      code: "seo-indexing-intent-forbidden-for-status",
      message: "indexingIntent=index requires publicationStatus=published.",
    });
  }

  return {
    documentId: document.identity.documentId,
    surface,
    passed: issues.length === 0,
    issues,
  };
}
