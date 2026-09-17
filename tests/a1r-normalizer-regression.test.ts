// A1R Phase 6 — normalizer regression corpus.
//
// MUST-DIFFER : each pair below must NOT normalize equal. If the normalizer ever
// collapses one, semantically-distinct source inputs would round-trip to the same
// AST and fidelity would silently pass on a lossy compilation.
//
// MUST-EQUAL : each pair below must normalize equal. These cover parser-only
// artefacts (line endings, positional data) that carry no semantic value.

import { describe, expect, it } from "vitest";

import { parseMarkdown } from "@/lib/content-surface-engine/producers/markdown/parse-markdown";
import { normalizeMdast } from "@/lib/content-surface-engine/producers/markdown/normalize-mdast";

function canon(src: string): string {
  return JSON.stringify(normalizeMdast(parseMarkdown(src)));
}

// ─────────────────────────────────────────────────────────────────────────────────
// MUST-DIFFER pairs
// ─────────────────────────────────────────────────────────────────────────────────

const mustDiffer: Array<[label: string, a: string, b: string]> = [
  [
    "A. ordered list start=1 vs start=3",
    "1. one\n2. two\n",
    "3. one\n4. two\n",
  ],
  [
    "B. link href=/foo vs href=/bar",
    "See [x](/foo).\n",
    "See [x](/bar).\n",
  ],
  [
    "C. link title absent vs title=\"Example\"",
    "See [x](/foo).\n",
    'See [x](/foo "Example").\n',
  ],
  [
    "D. strong(text) vs emphasis(text)",
    "**bold**\n",
    "*italic*\n",
  ],
  [
    "E. nested list item vs sibling list item",
    "- outer\n  - inner\n",
    "- outer\n- inner\n",
  ],
  [
    "F. two paragraphs vs one paragraph with hard break",
    "one\n\ntwo\n",
    "one  \ntwo\n",
  ],
  [
    "G. inlineCode('x') vs text('x')",
    "`x`\n",
    "x\n",
  ],
  [
    "H. blockquote(paragraph) vs paragraph",
    "> quoted\n",
    "quoted\n",
  ],
  [
    "I. table cell order A|B vs B|A",
    "| a | b |\n|---|---|\n| 1 | 2 |\n",
    "| b | a |\n|---|---|\n| 2 | 1 |\n",
  ],
  [
    "J. CTA marker present vs absent",
    "text\n\n<!-- cta:contextual -->\n\nmore\n",
    "text\n\nmore\n",
  ],
  [
    "K. same link text with different href",
    "See [click](/foo).\n",
    "See [click](/bar).\n",
  ],
  [
    "L. image same src but different alt",
    "![alt one](/img.png)\n",
    "![alt two](/img.png)\n",
  ],
];

describe("A1R normalizer must-differ", () => {
  it.each(mustDiffer)("%s", (_label, a, b) => {
    expect(canon(a)).not.toBe(canon(b));
  });
});

// ─────────────────────────────────────────────────────────────────────────────────
// MUST-EQUAL pairs (parser-only differences that are NOT semantic)
// ─────────────────────────────────────────────────────────────────────────────────

const mustEqual: Array<[label: string, a: string, b: string]> = [
  [
    "line endings CRLF vs LF",
    "one\r\n\r\ntwo\r\n",
    "one\n\ntwo\n",
  ],
  [
    "trailing LF absent vs present",
    "hello\n\nworld",
    "hello\n\nworld\n",
  ],
  [
    "same content, different parser position offsets (source blocks separated by extra blank line)",
    "one\n\ntwo\n",
    "one\n\n\ntwo\n",
  ],
];

describe("A1R normalizer must-equal (parser-only diffs)", () => {
  it.each(mustEqual)("%s", (_label, a, b) => {
    expect(canon(a)).toBe(canon(b));
  });
});
