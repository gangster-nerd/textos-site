// A1R Phase 3 — FIDELITY_PASS shared result shape.
//
// Producer-neutral by design. Markdown is one producer ; TextOS Act, external
// evidence chains, ShortsOS scripts are others. Each producer plugs in a
// concrete evaluator whose only obligation is to fill this result shape.

import { createHash } from "node:crypto";

/** Which producer emitted the ContentDocument being verified. */
export type ProducerKind =
  | "markdown-textos-insights"
  | "act-native-composition"
  | "shortsos-script"
  | "external-evidence-chain";

export type FidelityDifferenceKind =
  | "missing-in-roundtrip"
  | "extra-in-roundtrip"
  | "type-mismatch"
  | "value-mismatch"
  | "children-length-mismatch"
  | "leaf-mismatch";

export interface FidelityIssue {
  code: string;
  path: readonly (string | number)[];
  message: string;
  nearestBlockId?: string;
  differenceKind?: FidelityDifferenceKind;
  expected?: unknown;
  actual?: unknown;
}

export interface FidelityPassResult {
  producerKind: ProducerKind;
  documentId: string;
  sourceFingerprint: string;
  documentFingerprint: string;
  passed: boolean;
  issues: readonly FidelityIssue[];
  /** Diagnostic counts — never authoritative on their own. */
  counts?: {
    source: Record<string, number>;
    roundtrip: Record<string, number>;
  };
}

/**
 * Deterministic sha256 of arbitrary UTF-8 payload. Used for both source and document
 * fingerprints so downstream consumers can pin exact inputs.
 */
export function fingerprintUtf8(payload: string): string {
  return createHash("sha256").update(payload).digest("hex");
}
