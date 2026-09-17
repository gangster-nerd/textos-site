// A3R — INDEXABLE gate (four-gate conjunction).
//
//   INDEXABLE =
//     CONTENT_PASS
//     AND FIDELITY_PASS
//     AND SURFACE_PASS(reference@1, textos-site@1)
//     AND PUBLICATION_PASS
//
// FIDELITY_PASS is a first-class governance gate carried by the producer-neutral
// `FidelityPassResult` contract introduced by A1R. It certifies that the
// ContentDocument the engine received is a lossless representation of its
// producer's authoritative source (Markdown, TextOS Act plan, external
// evidence chain). A green FIDELITY_PASS is REQUIRED — an absent or
// wrong-document result fails closed.
//
// SURFACE_PASS is the mission-declared name for "the resolved surface renders
// under the generic REFERENCE renderer for the TextOS policy without error".
// It fails if `resolveContentSurface()` or the renderer's fail-closed guards
// throw. Here we accept a pre-computed boolean plus reasons so consumers can
// invoke rendering however they wish (some prefer to catch throw, others use
// a dry-run).
//
// Any RED input → noindex. Reasons are machine-readable.

import type { ContentPassResult } from "../conformance/content-pass";
import type { FidelityPassResult } from "../conformance/fidelity-pass";
import type { PublicationPassResult } from "./publication-pass";

export interface SurfacePassInput {
  passed: boolean;
  reasons: readonly string[];
}

export interface IndexableInput {
  contentPass: ContentPassResult;
  fidelityPass: FidelityPassResult;
  surfacePass: SurfacePassInput;
  publicationPass: PublicationPassResult;
}

export type IndexableFailReasonCode =
  | "content-pass-failed"
  | "fidelity-pass-failed"
  | "surface-pass-failed"
  | "publication-pass-failed"
  | "document-identity-mismatch";

export interface IndexableDecision {
  documentId: string;
  indexable: boolean;
  reasons: readonly {
    code: IndexableFailReasonCode;
    details: readonly string[];
  }[];
}

/**
 * Compute the four-gate INDEXABLE decision.
 *
 * The `documentId` on the decision is taken from the publication-pass input
 * because that is the authoritative identity the surface engine acted upon.
 * Every OTHER gate result is checked for identity CONSISTENCY : if any gate
 * carries a different `documentId`, the decision fails with
 * `document-identity-mismatch`. This prevents the accidental composition of
 * PASS verdicts drawn from different documents.
 */
export function decideIndexable(input: IndexableInput): IndexableDecision {
  const reasons: { code: IndexableFailReasonCode; details: readonly string[] }[] = [];
  const documentId = input.publicationPass.documentId;

  // Cross-document identity consistency. The `SurfacePassInput` shape does not
  // carry a documentId (some callers do dry-run rendering without a document
  // in scope), so it is intentionally not compared. CONTENT / FIDELITY /
  // PUBLICATION are all doc-typed and MUST agree.
  const mismatches: string[] = [];
  if (input.contentPass.documentId !== documentId) {
    mismatches.push(
      `contentPass.documentId=${input.contentPass.documentId} ≠ publicationPass.documentId=${documentId}`,
    );
  }
  if (input.fidelityPass.documentId !== documentId) {
    mismatches.push(
      `fidelityPass.documentId=${input.fidelityPass.documentId} ≠ publicationPass.documentId=${documentId}`,
    );
  }
  if (mismatches.length > 0) {
    reasons.push({ code: "document-identity-mismatch", details: mismatches });
  }

  if (!input.contentPass.passed) {
    reasons.push({
      code: "content-pass-failed",
      details: input.contentPass.issues
        .filter((i) => i.severity === "error")
        .map((i) => `${i.code}: ${i.message}`),
    });
  }
  if (!input.fidelityPass.passed) {
    reasons.push({
      code: "fidelity-pass-failed",
      details: input.fidelityPass.issues.map((i) => `${i.code}: ${i.message}`),
    });
  }
  if (!input.surfacePass.passed) {
    reasons.push({
      code: "surface-pass-failed",
      details: input.surfacePass.reasons,
    });
  }
  if (!input.publicationPass.passed) {
    reasons.push({
      code: "publication-pass-failed",
      details: input.publicationPass.issues.map((i) => `${i.code}: ${i.message}`),
    });
  }
  return { documentId, indexable: reasons.length === 0, reasons };
}
