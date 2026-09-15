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
import { resolveSourceAuthority } from "../composition/provenance-authority";

export type PublicationPassReasonCode =
  | "publication-status-not-publishable"
  | "surface-not-allowed"
  | "source-authority-uncertified"
  | "source-authority-mismatch"
  | "non-git-provenance-not-authorized"
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
  //
  // `authorizeNonGitProvenance` (default: FALSE) — non-Git producers (Act, external
  // evidence chains) MUST be explicitly authorized before their sourceEvidenceDigest can
  // stand in for a certified Git SHA. Absence of authorization = fail closed. This is a
  // POSITIVE-AUTHORIZATION flag — omission cannot accidentally publish a non-Git evidence
  // chain.
  authorizeNonGitProvenance?: boolean;
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
  //
  // `document.provenance.sourceAuthority` is producer-declared metadata. The gate NEVER
  // trusts it. The T0 lineage resolver (content/certified-lineage.json) is authoritative;
  // a producer cannot elevate itself by writing "CERTIFIED_MAIN" into its own document.
  //
  // Rules:
  //   * Git-backed (sourceSha present) → resolve against T0 lineage.
  //       - unknown SHA         → source-authority-uncertified (fail closed).
  //       - certified SHA       → OK; if the declared sourceAuthority disagrees with the
  //                                resolved authority, we ALSO emit source-authority-mismatch
  //                                so the discrepancy is surfaced. The mismatch does not
  //                                lower authority beyond what T0 says; it only refuses to
  //                                let a producer downgrade or forge.
  //   * Non-Git (no sourceSha) → require an EXPLICIT positive authorization from the caller.
  //                                Default = fail closed (non-git-provenance-not-authorized).
  const declared = document.provenance.sourceAuthority;
  if (document.provenance.sourceSha) {
    const resolved = resolveSourceAuthority({ sourceSha: document.provenance.sourceSha });
    if (resolved.authority === "UNCERTIFIED") {
      issues.push({
        code: "source-authority-uncertified",
        message:
          `sourceSha ${document.provenance.sourceSha} is not in content/certified-lineage.json ` +
          `(T0 authoritative — declared sourceAuthority=${declared} is ignored).`,
      });
    } else if (declared !== resolved.authority) {
      // The document declared something different from T0. Publication proceeds only if the
      // caller understands the mismatch — but we always record it.
      issues.push({
        code: "source-authority-mismatch",
        message:
          `declared sourceAuthority=${declared} differs from T0-resolved authority=${resolved.authority}.`,
      });
    }
  } else {
    // Non-Git provenance. sourceEvidenceDigest may exist; permission is a positive-caller
    // decision. Omission = fail closed.
    if (input.authorizeNonGitProvenance !== true) {
      issues.push({
        code: "non-git-provenance-not-authorized",
        message:
          "no sourceSha declared and non-Git provenance is not authorized by policy " +
          "(set authorizeNonGitProvenance=true on the caller to accept sourceEvidenceDigest).",
      });
    }
  }

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
