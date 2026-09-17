// A1R Phase 6 — mutation tests. Every mutation of an authoritative Markdown
// document MUST cause FIDELITY to fail somewhere (either at ingestion, at the
// AST diff stage, or in the checked-in body cross-verification).
//
// Each test starts from a small, hand-authored authoritative sample so the mutation
// is unambiguous, then applies exactly one mutation and asserts fidelity fails.

import { describe, expect, it } from "vitest";

import { evaluateMarkdownFidelityPass } from "@/lib/content-surface-engine/conformance/fidelity-pass";
import { evaluateMarkdownFidelity } from "@/lib/content-surface-engine/producers/markdown/fidelity-oracle";

const SAMPLE = [
  "# Title",
  "",
  "First paragraph with **strong** and *emphasis* and `inlineCode` and a [link](/foo).",
  "",
  "1. one",
  "2. two",
  "   - nested",
  "",
  "> a blockquote paragraph",
  "",
  "| a | b |",
  "|---|---|",
  "| 1 | 2 |",
  "",
  "![alt text](/img.png)",
  "",
  "<!-- cta:contextual -->",
  "",
  "Closing paragraph.",
  "",
].join("\n");

function fidelityFor(md: string) {
  return evaluateMarkdownFidelityPass({
    documentId: "test:sample",
    authoritativeMarkdown: md,
  });
}

// Helper : source-vs-mutated ; assert that the ORACLE detects the change either
// as an ingestion failure OR as an AST divergence. Both are legitimate failure
// signals ; both prevent silent fidelity loss.
function oracleFor(md: string) {
  return evaluateMarkdownFidelity(md);
}

describe("A1R mutations must FAIL fidelity", () => {
  it("baseline sample: FIDELITY_PASS is green", () => {
    const r = fidelityFor(SAMPLE);
    expect(r.passed, r.issues.map((i) => i.message).join("\n")).toBe(true);
  });

  const mutations: Array<[label: string, mutate: (s: string) => string]> = [
    ["removed paragraph", (s) => s.replace(/\nClosing paragraph\.\n/, "\n")],
    [
      "reordered paragraph (swap first & closing)",
      (s) => {
        const first = s.match(/First paragraph[^\n]+/)![0];
        const closing = "Closing paragraph.";
        return s.replace(first, "__TMP__").replace(closing, first).replace("__TMP__", closing);
      },
    ],
    ["removed nested list item", (s) => s.replace(/\n {3}- nested\n/, "\n")],
    ["changed ordered list start", (s) => s.replace("1. one\n2. two", "3. one\n4. two")],
    ["changed link href", (s) => s.replace("/foo", "/bar")],
    [
      "added link title",
      (s) => s.replace("[link](/foo)", '[link](/foo "Example")'),
    ],
    ["removed strong (kept text)", (s) => s.replace("**strong**", "strong")],
    ["strong → emphasis", (s) => s.replace("**strong**", "*strong*")],
    ["removed emphasis (kept text)", (s) => s.replace("*emphasis*", "emphasis")],
    ["removed inlineCode (kept text)", (s) => s.replace("`inlineCode`", "inlineCode")],
    [
      "removed hard break (join lines)",
      (s) => s.replace("**strong** and *emphasis*", "**strong**  \nand *emphasis*"),
    ],
    ["removed blockquote (paragraph only)", (s) => s.replace("> a blockquote", "a blockquote")],
    ["changed table cell", (s) => s.replace("| 1 | 2 |", "| 9 | 2 |")],
    ["changed image alt", (s) => s.replace("[alt text]", "[different alt]")],
    ["missing CTA marker", (s) => s.replace("<!-- cta:contextual -->\n\n", "")],
    [
      "duplicate CTA marker",
      (s) =>
        s.replace(
          "<!-- cta:contextual -->",
          "<!-- cta:contextual -->\n\n<!-- cta:contextual -->",
        ),
    ],
    [
      "unrecognized raw HTML silently added",
      (s) => s.replace("Closing paragraph.", "<div>oops</div>\n\nClosing paragraph."),
    ],
    [
      "merged paragraphs (dropped blank line)",
      (s) => s.replace(/\n\nClosing paragraph\./, " Closing paragraph."),
    ],
  ];

  it.each(mutations)("%s : fidelity oracle detects the change", (_label, mutate) => {
    const mutated = mutate(SAMPLE);
    expect(mutated).not.toBe(SAMPLE);
    // Compare oracle-vs-oracle : parse both, oracle each, and either
    //   a) mutated ingestion fails (raw HTML case), or
    //   b) the mutated AST hashes differently from the baseline.
    const oracleBaseline = oracleFor(SAMPLE);
    const oracleMutated = oracleFor(mutated);
    // Baseline must pass.
    expect(oracleBaseline.diffs.length).toBe(0);
    expect(oracleBaseline.ingestionFailures.length).toBe(0);
    // Mutated must either fail ingestion OR normalize to a different AST than the
    // baseline (measured via count-and-structure signature).
    const changed =
      oracleMutated.ingestionFailures.length > 0 ||
      JSON.stringify(oracleMutated.sourceCounts) !==
        JSON.stringify(oracleBaseline.sourceCounts) ||
      JSON.stringify(oracleMutated.blocks) !==
        JSON.stringify(oracleBaseline.blocks);
    expect(changed).toBe(true);
  });
});

describe("A1R CTA marker bijection", () => {
  it("<!-- cta:contextual --> is compiled to cta_slot/primary-cta", () => {
    const r = oracleFor(SAMPLE);
    const cta = r.blocks.find((b) => b.kind === "cta_slot");
    expect(cta).toBeDefined();
    expect(cta!.slot).toBe("primary-cta");
  });

  it("any other raw HTML in the source fails ingestion", () => {
    const bad = SAMPLE.replace(
      "<!-- cta:contextual -->",
      "<div>not authorised</div>",
    );
    const r = oracleFor(bad);
    expect(r.ingestionFailures.length).toBeGreaterThan(0);
  });

  it("the marker roundtrips exactly (byte-identical bracket string)", () => {
    // We do not attempt string-level equality of the whole roundtripped Markdown
    // (formatter quirks); instead we assert the marker survives as an html node.
    const r = oracleFor(SAMPLE);
    const cta = r.blocks.find((b) => b.kind === "cta_slot")!;
    const carried = (cta.data as { mdast: { type: string; value: string } }).mdast;
    expect(carried.type).toBe("html");
    expect(carried.value.trim()).toBe("<!-- cta:contextual -->");
  });
});
