// A2R-PORT §6 — canonical author route.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("out/authors/marc-prempain.html");

if (!fs.existsSync(OUT)) {
  throw new Error(
    "A2R author-route test requires `pnpm build` output. Run `pnpm verify:a2r`.",
  );
}

describe("A2R — /authors/marc-prempain", () => {
  const html = fs.readFileSync(OUT, "utf8");

  it("renders Marc Prempain", () => {
    expect(html).toContain("Marc Prempain");
  });

  it("links back to /insights", () => {
    expect(html).toMatch(/href="\/insights"/);
  });

  it("emits robots noindex (page is intentionally low-content today)", () => {
    expect(html).toMatch(/<meta name="robots" content="noindex/);
  });

  it("emits JSON-LD Person node with worksFor Organization TextOS", () => {
    const ld = [
      ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
    ]
      .map((m) => m[1])
      .join("\n");
    expect(ld).toMatch(/"@type"\s*:\s*"Person"/);
    expect(ld).toMatch(/urn:textos:org/);
    expect(ld).toMatch(/Marc Prempain/);
  });
});
