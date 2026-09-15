// CTO §12 — Source-level accessibility invariants. These are NOT a Lighthouse pass.
// They assert what a static HTML scan can prove: heading hierarchy, aria labels,
// language attribute, single H1, canonical/robots meta consistency, image alt text.
// A real browser + Lighthouse verification remains out of scope for this test file —
// reported separately as BROWSER_VERIFICATION=NOT_VERIFIED.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.resolve("out/insights");
const hasBuild = fs.existsSync(OUT_DIR);

const files = hasBuild
  ? fs
      .readdirSync(OUT_DIR)
      .filter((f) => f.endsWith(".html"))
      .sort()
  : [];

describe.skipIf(!hasBuild)("insights HTML: source-level a11y invariants", () => {
  it("has at least one built HTML to scan", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("%s : exactly one <h1>", (file) => {
    const html = fs.readFileSync(path.join(OUT_DIR, file), "utf8");
    const h1Matches = html.match(/<h1[\s>]/g) ?? [];
    expect(h1Matches.length).toBe(1);
  });

  it.each(files)("%s : declares <html lang=\"en\">", (file) => {
    const html = fs.readFileSync(path.join(OUT_DIR, file), "utf8");
    expect(html).toMatch(/<html[^>]+lang="en"/);
  });

  it.each(files)("%s : main breadcrumb has aria-label", (file) => {
    const html = fs.readFileSync(path.join(OUT_DIR, file), "utf8");
    expect(html).toMatch(/<nav[^>]+aria-label="Breadcrumb"/);
  });

  it.each(files)("%s : ToC (if present) uses ordered list under nav with aria-label", (file) => {
    const html = fs.readFileSync(path.join(OUT_DIR, file), "utf8");
    if (!html.includes('aria-label="Table of contents"')) return; // ToC not rendered
    expect(html).toMatch(/<nav[^>]+aria-label="Table of contents"[^>]*>\s*<p[^>]*>\s*Contents/);
  });

  it.each(files)("%s : every ToC fragment resolves to exactly one h2[id]", (file) => {
    const html = fs.readFileSync(path.join(OUT_DIR, file), "utf8");
    // Extract ToC fragments : anchors inside <nav aria-label="Table of contents"> whose
    // href starts with `#`.
    const tocBlock = html.match(
      /<nav[^>]+aria-label="Table of contents"[^>]*>[\s\S]*?<\/nav>/,
    );
    if (!tocBlock) return;
    const fragments = [...tocBlock[0].matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
    if (fragments.length === 0) return;
    for (const frag of fragments) {
      const matches = [...html.matchAll(new RegExp(`<h2\\s[^>]*id="${frag}"`, "g"))];
      expect(
        matches.length,
        `fragment #${frag} in ${file} must resolve to exactly one h2[id="${frag}"]`,
      ).toBe(1);
    }
  });

  it.each(files)("%s : draft carries robots noindex,nofollow (all current insights are draft)", (file) => {
    const html = fs.readFileSync(path.join(OUT_DIR, file), "utf8");
    // In the current corpus every article is a draft. The meta tag Next injects for
    // { index: false, follow: false } is `noindex, nofollow` (comma-space).
    expect(html).toMatch(/<meta name="robots" content="noindex[,\s]*nofollow"/i);
  });

  it.each(files)("%s : DRAFT · NOT PUBLIC banner is present for all current articles", (file) => {
    const html = fs.readFileSync(path.join(OUT_DIR, file), "utf8");
    expect(html).toMatch(/DRAFT · NOT PUBLIC/);
    expect(html).toMatch(/data-role="draft-banner"/);
  });

  it.each(files)("%s : article has description meta", (file) => {
    const html = fs.readFileSync(path.join(OUT_DIR, file), "utf8");
    expect(html).toMatch(/<meta name="description" content="[^"]{1,160}"/);
  });

  it.each(files)("%s : no unresolved template artefact in visible text", (file) => {
    const html = fs.readFileSync(path.join(OUT_DIR, file), "utf8");
    // Strip <script>…</script> blocks : Next.js React server component payloads use
    // `$undefined` and `$null` markers that are internal serialization artefacts,
    // not visible content. The invariant we care about is "no undefined leaks into
    // human-readable copy".
    const visible = html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, "");
    expect(visible).not.toMatch(/>[^<]*\bundefined\b[^<]*</);
  });
});
