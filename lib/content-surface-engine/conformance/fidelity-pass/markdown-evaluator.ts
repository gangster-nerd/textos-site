// A1R Phase 3 — Markdown producer implementation of FIDELITY_PASS.
//
// Wraps the low-level oracle in producers/markdown so the caller only touches the
// shared FidelityPassResult shape.

import type { ContentDocument } from "../../contract/content-document";
import { ContentDocumentSchema } from "../../contract/content-document";
import { evaluateMarkdownFidelity } from "../../producers/markdown/fidelity-oracle";

import {
  fingerprintUtf8,
  type FidelityIssue,
  type FidelityPassResult,
} from "./result";

export interface EvaluateMarkdownFidelityPassInput {
  documentId: string;
  authoritativeMarkdown: string;
  /**
   * Optional: the caller may supply the compiled ContentDocument to have the fidelity
   * evaluator additionally CROSS-VERIFY that the compiled body it recomputed matches
   * the checked-in document body. This detects hand-edits.
   */
  compiledDocument?: ContentDocument;
}

const PRODUCER_KIND = "markdown-textos-insights" as const;

export function evaluateMarkdownFidelityPass(
  input: EvaluateMarkdownFidelityPassInput,
): FidelityPassResult {
  const oracle = evaluateMarkdownFidelity(input.authoritativeMarkdown);
  const issues: FidelityIssue[] = [];

  for (const failure of oracle.ingestionFailures) {
    issues.push({
      code: "ingestion-failure",
      path: failure.path,
      message: failure.message,
    });
  }

  for (const d of oracle.diffs) {
    issues.push({
      code: "ast-divergence",
      path: d.path,
      message: `${d.differenceKind} at ${pathString(d.path)}`,
      nearestBlockId: d.nearestBlockId,
      differenceKind: d.differenceKind,
      expected: d.expected,
      actual: d.actual,
    });
  }

  // Cross-verify checked-in body against recompiled body if a document was supplied.
  if (input.compiledDocument && oracle.ingestionFailures.length === 0) {
    // Validate the checked-in doc first — a malformed doc is a distinct failure.
    const parsed = ContentDocumentSchema.safeParse(input.compiledDocument);
    if (!parsed.success) {
      for (const zi of parsed.error.issues) {
        issues.push({
          code: "checked-in-document-invalid",
          path: zi.path.map((p) =>
            typeof p === "symbol" ? String(p) : (p as string | number),
          ),
          message: zi.message,
        });
      }
    } else {
      const expectedBody = oracle.blocks.map((b) => {
        const bx = b as {
          kind: string;
          slot?: string;
          level?: number;
          data: Record<string, unknown>;
        };
        return {
          kind: bx.kind,
          slot: bx.slot ?? null,
          level: bx.level ?? null,
          mdast: (bx.data as { mdast?: unknown }).mdast,
        };
      });
      const actualBody = parsed.data.body.map((b) => {
        const bx = b as {
          kind: string;
          slot?: string;
          level?: number;
          data: Record<string, unknown>;
        };
        return {
          kind: bx.kind,
          slot: bx.slot ?? null,
          level: bx.level ?? null,
          mdast: (bx.data as { mdast?: unknown } | undefined)?.mdast,
        };
      });
      // Filter out synthetic non-authoritative blocks (no mdast payload) on the
      // checked-in side — related_content_slot / injected policy slots are legitimate
      // additions to the document but do NOT participate in fidelity.
      const actualAuthoritative = actualBody.filter((b) => b.mdast !== undefined);
      if (
        canonicalStringify(actualAuthoritative) !== canonicalStringify(expectedBody)
      ) {
        issues.push({
          code: "checked-in-body-does-not-match-recompiled",
          path: ["body"],
          message:
            "The checked-in ContentDocument.body diverges from the body recompiled from the authoritative Markdown. Regenerate via `pnpm a1r:regenerate-corpus` instead of hand-editing.",
        });
      }
    }
  }

  const documentFingerprint = input.compiledDocument
    ? fingerprintUtf8(JSON.stringify(input.compiledDocument))
    : fingerprintUtf8(JSON.stringify(oracle.blocks));

  return {
    producerKind: PRODUCER_KIND,
    documentId: input.documentId,
    sourceFingerprint: fingerprintUtf8(input.authoritativeMarkdown),
    documentFingerprint,
    passed: issues.length === 0,
    issues,
    counts: {
      source: (oracle.sourceCounts as unknown) as Record<string, number>,
      roundtrip: (oracle.roundtripCounts as unknown) as Record<string, number>,
    },
  };
}

function pathString(path: readonly (string | number)[]): string {
  return path.map((p) => (typeof p === "number" ? `[${p}]` : `.${p}`)).join("");
}

/**
 * Canonical stringify — object keys sorted at every depth so two structurally-
 * equal payloads with different key insertion orders compare equal.
 */
function canonicalStringify(v: unknown): string {
  const sorted = sortKeysDeep(v);
  return JSON.stringify(sorted);
}

function sortKeysDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeysDeep);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      out[k] = sortKeysDeep((v as Record<string, unknown>)[k]);
    }
    return out;
  }
  return v;
}
