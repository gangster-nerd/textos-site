// A2R-SURFACE-SEAL-1 §5 — every built Insight page's JSON-LD is inspected.
//
// Every one of the 12 built insight HTML pages MUST satisfy :
//   1. Every JSON-LD `<script type="application/ld+json">` block parses.
//   2. Draft honesty : no Article / TechArticle / BlogPosting node ; no
//      datePublished / dateModified anywhere in the emitted JSON.
//   3. When an author node is emitted, it is Marc Prempain.
//   4. When a publisher / worksFor Organization is emitted, name is TextOS
//      (via urn:textos:org).
//   5. Social image asset referenced in metadata is actually on disk.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.resolve("out/insights");
if (!fs.existsSync(OUT_DIR)) {
  throw new Error(
    "A2R JSON-LD test requires `pnpm build` output at out/insights. Run `pnpm verify:a2r`.",
  );
}

const files = fs
  .readdirSync(OUT_DIR)
  .filter((f) => f.endsWith(".html"))
  .sort();

describe("A2R — 12/12 insight JSON-LD honest & consistent", () => {
  it("build produced 12 insight HTML files", () => {
    expect(files.length).toBe(12);
  });

  it.each(files)("%s : ld+json parses, draft-honest, identity-consistent", (file) => {
    const html = fs.readFileSync(path.join(OUT_DIR, file), "utf8");
    const blocks = [
      ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
    ].map((m) => m[1]);
    expect(blocks.length, `${file} : at least one JSON-LD block`).toBeGreaterThan(0);

    // 1. every block parses
    const parsed = blocks.map((raw, i) => {
      try {
        return JSON.parse(raw);
      } catch (e) {
        throw new Error(
          `${file} : JSON-LD block ${i} unparsable — ${(e as Error).message}`,
        );
      }
    });

    // Flatten @graph wrappers so we can inspect every emitted node.
    const nodes: Record<string, unknown>[] = [];
    for (const p of parsed) {
      if (Array.isArray((p as { "@graph"?: unknown[] })["@graph"])) {
        nodes.push(...(p as { "@graph": Record<string, unknown>[] })["@graph"]);
      } else {
        nodes.push(p as Record<string, unknown>);
      }
    }

    // 2. drafts emit NO Article / TechArticle / BlogPosting node.
    const articleTypes = new Set(["Article", "TechArticle", "BlogPosting"]);
    for (const n of nodes) {
      const t = (n as { "@type"?: string })["@type"];
      expect(
        articleTypes.has(String(t)),
        `${file} : draft must not emit ${t} node`,
      ).toBe(false);
    }

    // 2. no dateXxx anywhere in JSON.
    const blob = JSON.stringify(parsed);
    expect(blob, `${file} : draft leaked datePublished`).not.toMatch(/"datePublished"/);
    expect(blob, `${file} : draft leaked dateModified`).not.toMatch(/"dateModified"/);

    // 3. author identity — when a Person is emitted, name is Marc Prempain.
    const persons = nodes.filter(
      (n) => (n as { "@type"?: string })["@type"] === "Person",
    );
    for (const p of persons) {
      const name = (p as { name?: string }).name;
      expect(
        name,
        `${file} : Person JSON-LD name must be "Marc Prempain" (got "${name}")`,
      ).toBe("Marc Prempain");
    }

    // 4. Organization publisher must include the canonical urn:textos:org id.
    const orgs = nodes.filter(
      (n) => (n as { "@type"?: string })["@type"] === "Organization",
    );
    if (orgs.length > 0) {
      const ids = orgs.map((o) => (o as { "@id"?: string })["@id"]);
      expect(ids, `${file} : Organization id set`).toContain("urn:textos:org");
      const textosOrg = orgs.find(
        (o) => (o as { "@id"?: string })["@id"] === "urn:textos:org",
      ) as { name?: string } | undefined;
      expect(textosOrg?.name).toBe("TextOS");
    }

    // 5. social image asset exists on disk.
    const slug = file.replace(/\.html$/, "");
    expect(
      fs.existsSync(path.resolve("public/og/insights", `${slug}.svg`)),
      `${file} : /og/insights/${slug}.svg missing on disk`,
    ).toBe(true);
  });
});
