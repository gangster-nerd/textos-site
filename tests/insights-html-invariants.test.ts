// CTC-CSE-CONVERGENCE-1 — source-level invariants on the CSE-emitted /insights HTML.
//
// This test scans out/insights/*.html after `pnpm build` and asserts what a static-HTML
// inspection can prove. The visual certification (Lighthouse, keyboard focus, real screen
// reader) is a separate step — never inferred from source patterns alone.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.resolve("out/insights");
const hasBuild = fs.existsSync(OUT_DIR);

const files = hasBuild
  ? fs
      .readdirSync(OUT_DIR)
      .filter((f) => f.endsWith(".html") && !fs.statSync(path.join(OUT_DIR, f)).isDirectory())
      .sort()
  : [];

describe.skipIf(!hasBuild)("out/insights/*.html — source-level invariants", () => {
  it("build produced 12 insight HTML files", () => {
    expect(files.length).toBe(12);
  });

  it.each(files)("%s : <html lang=\"en\">", (file) => {
    const html = fs.readFileSync(path.join(OUT_DIR, file), "utf8");
    expect(html).toMatch(/<html[^>]+lang="en"/);
  });

  it.each(files)("%s : exactly one <h1>", (file) => {
    const html = fs.readFileSync(path.join(OUT_DIR, file), "utf8");
    const h1s = (html.match(/<h1[\s>]/g) ?? []).length;
    expect(h1s).toBe(1);
  });

  it.each(files)("%s : DRAFT · NOT PUBLIC banner (all 12 are currently drafts)", (file) => {
    const html = fs.readFileSync(path.join(OUT_DIR, file), "utf8");
    expect(html).toMatch(/DRAFT · NOT PUBLIC/);
    expect(html).toMatch(/data-role="draft-banner"/);
  });

  it.each(files)("%s : robots noindex + nofollow (drafts are unindexed AND unfollowed)", (file) => {
    const html = fs.readFileSync(path.join(OUT_DIR, file), "utf8");
    expect(html).toMatch(/<meta name="robots" content="noindex[,\s]*nofollow"/i);
  });

  it.each(files)("%s : draft emits NO datePublished / dateModified in JSON-LD", (file) => {
    const html = fs.readFileSync(path.join(OUT_DIR, file), "utf8");
    const ldMatches = [
      ...html.matchAll(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
      ),
    ].map((m) => m[1]);
    const blob = ldMatches.join("\n");
    expect(blob).not.toMatch(/"datePublished"/);
    expect(blob).not.toMatch(/"dateModified"/);
  });

  it.each(files)("%s : CSE composition signature stamped on body", (file) => {
    const html = fs.readFileSync(path.join(OUT_DIR, file), "utf8");
    // ManagedTextosSurface stamps data-cse-composition-signature; its presence proves
    // the page was composed through CSE, not through a competing renderer.
    expect(html).toMatch(/data-cse-composition-signature="[^"]+"/);
    // And carry the reference@2 render version (CMO-SURFACE-VERTICAL-SLICE-1).
    expect(html).toMatch(/data-cse-render-version="reference@2"/);
  });

  it.each(files)("%s : uses managed textos surface policy", (file) => {
    const html = fs.readFileSync(path.join(OUT_DIR, file), "utf8");
    expect(html).toMatch(/data-cse-surface-policy="textos-site\.reference@1"/);
  });
});
