// A1R Phase 6 — fidelity oracle on the 12 authoritative Markdown articles.
//
// For each of `content/insights/*.md` we assert :
//   1. FIDELITY_PASS is green (SOURCE_AST === ROUNDTRIP_AST after normalization).
//   2. The corresponding checked-in ContentDocument at
//      `content/managed-corpus/*.json` matches the body recompiled from the source.
//   3. No ingestion failures.
//   4. Semantic counts on source and roundtrip agree (diagnostic).

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

import { ContentDocumentSchema } from "@/lib/content-surface-engine/contract/content-document";
import { evaluateMarkdownFidelityPass } from "@/lib/content-surface-engine/conformance/fidelity-pass";

const INSIGHTS_DIR = "content/insights";
const CORPUS_DIR = "content/managed-corpus";

const files = readdirSync(INSIGHTS_DIR)
  .filter((f) => f.endsWith(".md"))
  .sort();

describe("A1R — Markdown fidelity oracle on 12 authoritative articles", () => {
  it("finds 12 authoritative md files", () => {
    expect(files.length).toBe(12);
  });

  it.each(files)("%s : FIDELITY_PASS + body matches checked-in corpus", (file) => {
    const slug = file.replace(/\.md$/, "");
    const raw = readFileSync(path.join(INSIGHTS_DIR, file), "utf8");
    const { content } = matter(raw);
    const corpus = JSON.parse(
      readFileSync(path.join(CORPUS_DIR, `${slug}.json`), "utf8"),
    );
    const doc = ContentDocumentSchema.parse(corpus);

    const result = evaluateMarkdownFidelityPass({
      documentId: doc.identity.documentId,
      authoritativeMarkdown: content,
      compiledDocument: doc,
    });

    if (!result.passed) {
      // Bubble a compact human-readable summary of the diffs on failure.
      const summary = result.issues
        .slice(0, 5)
        .map(
          (i) =>
            `[${i.code}] ${i.differenceKind ?? ""} at ${i.path.map((p) => `${typeof p === "number" ? `[${p}]` : `.${p}`}`).join("")} — ${i.message}`,
        )
        .join("\n");
      throw new Error(
        `${slug}: FIDELITY_PASS failed with ${result.issues.length} issue(s)\n${summary}`,
      );
    }

    expect(result.passed).toBe(true);
    expect(result.issues).toEqual([]);
    // Counter parity is a diagnostic — not authoritative — but useful signal.
    expect(result.counts?.source).toEqual(result.counts?.roundtrip);
  });
});
