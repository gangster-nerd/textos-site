// A3 — INDEXABLE gate.
//
// INDEXABLE = CONTENT_PASS AND SURFACE_PASS(reference@1, textos-site@1) AND PUBLICATION_PASS
//
// SURFACE_PASS is the mission-declared name for "the resolved surface renders under the
// generic REFERENCE renderer for the TextOS policy without error". It fails if
// `resolveContentSurface()` or the renderer's fail-closed guards throw. Here we accept a
// pre-computed boolean plus reasons so consumers can invoke rendering however they wish
// (some prefer to catch throw, others use a dry-run).
//
// Any RED input → noindex. Reasons are machine-readable.

import type { ContentPassResult } from "../conformance/content-pass";
import type { PublicationPassResult } from "./publication-pass";

export interface SurfacePassInput {
  passed: boolean;
  reasons: readonly string[];
}

export interface IndexableInput {
  contentPass: ContentPassResult;
  surfacePass: SurfacePassInput;
  publicationPass: PublicationPassResult;
}

export type IndexableFailReasonCode =
  | "content-pass-failed"
  | "surface-pass-failed"
  | "publication-pass-failed";

export interface IndexableDecision {
  documentId: string;
  indexable: boolean;
  reasons: readonly {
    code: IndexableFailReasonCode;
    details: readonly string[];
  }[];
}

export function decideIndexable(input: IndexableInput): IndexableDecision {
  const reasons: { code: IndexableFailReasonCode; details: readonly string[] }[] = [];
  const documentId = input.publicationPass.documentId;

  if (!input.contentPass.passed) {
    reasons.push({
      code: "content-pass-failed",
      details: input.contentPass.issues
        .filter((i) => i.severity === "error")
        .map((i) => `${i.code}: ${i.message}`),
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
