// CMO-SURFACE-VISUAL-CORRECTION-1 — stale canonical-dek regression.
//
// The prior canonical dek for `authority-intelligence-not-ai-seo` used a
// causal framing ("measures WHY answer engines cite or ignore a brand") that
// contradicts TextOS's observation-not-optimization doctrine. This test
// enforces that the stale wording cannot reach any built public projection
// (visible dek, meta description, OG, JSON-LD description, Related summaries)
// nor the canonical source of truth (managed corpus + markdown source).

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const STALE_FRAGMENT = "measures why answer engines cite or ignore";
const OUT_DIR = path.resolve("out/insights");
const hasBuild = fs.existsSync(OUT_DIR);

describe("CMO-VISUAL-CORRECTION-1 — stale causal dek cannot reach production", () => {
  it("canonical corpus does NOT contain the stale wording", () => {
    const json = fs.readFileSync(
      path.resolve("content/managed-corpus/authority-intelligence-not-ai-seo.json"),
      "utf8",
    );
    expect(json).not.toContain(STALE_FRAGMENT);
  });

  it("markdown source does NOT contain the stale wording", () => {
    const md = fs.readFileSync(
      path.resolve("content/insights/authority-intelligence-not-ai-seo.md"),
      "utf8",
    );
    expect(md).not.toContain(STALE_FRAGMENT);
  });

  it.skipIf(!hasBuild)("no built /insights HTML file contains the stale wording", () => {
    const files = fs
      .readdirSync(OUT_DIR)
      .filter((f) => f.endsWith(".html"));
    for (const f of files) {
      const html = fs.readFileSync(path.join(OUT_DIR, f), "utf8");
      expect(html, `stale causal dek found in ${f}`).not.toContain(STALE_FRAGMENT);
    }
  });
});
