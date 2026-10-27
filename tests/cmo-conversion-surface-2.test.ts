// CMO-CONVERSION-SURFACE-2 — acceptance invariants for the derived
// conversion plan. Runs against `out/insights/*.html` when present.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.resolve("out/insights");
const hasBuild = fs.existsSync(OUT_DIR);

const NO_COMMERCIAL_SLUGS = new Set<string>([
  // Documents whose canonical `conversion.ctaIntentId` is null → no CTA.
  "agent-protocol-immutable-frontiers",
  "north-star-brief-acceptance",
  "observation-not-optimization",
]);

function articles(): string[] {
  return fs
    .readdirSync(OUT_DIR)
    .filter((f) => f.endsWith(".html") && !f.startsWith("__"))
    .sort();
}

function countMatches(html: string, re: RegExp): number {
  return (html.match(re) ?? []).length;
}

describe.skipIf(!hasBuild)("CMO-CONVERSION-SURFACE-2 — 12/12 acceptance", () => {
  it("exactly one editorial next step per article", () => {
    for (const f of articles()) {
      const html = fs.readFileSync(path.join(OUT_DIR, f), "utf8");
      const n = countMatches(html, /data-role="editorial-next-step"/g);
      expect(n, `${f} editorial-next-step count`).toBe(1);
    }
  });

  it("commercial CTA slot counts respect governance", () => {
    for (const f of articles()) {
      const slug = f.replace(/\.html$/, "");
      const html = fs.readFileSync(path.join(OUT_DIR, f), "utf8");
      const header = countMatches(html, /data-cse-cta-slot="header"/g);
      const contextual = countMatches(html, /data-cse-cta-slot="contextual"/g);
      const final = countMatches(html, /data-cse-cta-slot="final"/g);
      if (NO_COMMERCIAL_SLUGS.has(slug)) {
        expect(header, `${slug} header`).toBe(0);
        expect(contextual, `${slug} contextual`).toBe(0);
        expect(final, `${slug} final`).toBe(0);
      } else {
        expect(header, `${slug} header`).toBe(1);
        expect(final, `${slug} final`).toBe(1);
        // contextual is optional (only when a cta_slot block exists)
        expect(contextual, `${slug} contextual max 1`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("no commercial CTA has a dead destination", () => {
    for (const f of articles()) {
      const html = fs.readFileSync(path.join(OUT_DIR, f), "utf8");
      const dests = [...html.matchAll(/data-cse-cta-destination="([^"]+)"/g)].map((m) => m[1]);
      for (const d of dests) {
        expect(d, `${f} cta dest`).not.toBe("#");
        expect(d.startsWith("javascript:"), `${f} javascript scheme`).toBe(false);
        expect(d.length, `${f} empty dest`).toBeGreaterThan(0);
      }
    }
  });

  it("authority-intelligence article now carries a first-measurement CTA", () => {
    const html = fs.readFileSync(
      path.join(OUT_DIR, "authority-intelligence-not-ai-seo.html"),
      "utf8",
    );
    expect(html).toMatch(/data-cse-cta-slot="header"/);
    expect(html).toMatch(/data-cse-cta-slot="final"/);
    expect(html).toMatch(/href="\/request-measurement"/);
  });

  it("CMO-CONVERSION-TRUTH-FIX-2A : MEASURE_BRAND + /request-measurement → honest 'Request' label", () => {
    // Binding : the governed variant MEASURE_BRAND resolves to the internal
    // /request-measurement page (see lib/conversion/cta-registry.ts:91). The
    // page is a REQUEST form, not a self-serve runner ; the label must not
    // promise instant execution.
    const forbidden = [
      "Start your first measurement",
      "Run your first measurement",
      "Start now",
      "instant measurement",
      "self-serve measurement",
    ];
    for (const f of articles()) {
      const html = fs.readFileSync(path.join(OUT_DIR, f), "utf8");
      for (const stale of forbidden) {
        expect(html, `${f}: forbidden CTA copy "${stale}"`).not.toContain(stale);
      }
    }
    // At least the 9 commercial articles carry the honest label + the real
    // destination side-by-side. Neither ever appears with the stale label.
    let hits = 0;
    for (const f of articles()) {
      const html = fs.readFileSync(path.join(OUT_DIR, f), "utf8");
      if (
        html.includes("Request your first measurement") &&
        html.includes('href="/request-measurement"')
      ) {
        hits += 1;
      }
    }
    expect(hits, "commercial articles binding label ↔ destination").toBeGreaterThanOrEqual(9);
  });

  it("at most one newsletter box per article", () => {
    for (const f of articles()) {
      const html = fs.readFileSync(path.join(OUT_DIR, f), "utf8");
      const n = countMatches(html, /data-role="newsletter"/g);
      expect(n, `${f} newsletter count`).toBeLessThanOrEqual(1);
    }
  });

  it("unconfigured newsletter box cannot submit and is labelled in preview", () => {
    const html = fs.readFileSync(
      path.join(OUT_DIR, "authority-intelligence-not-ai-seo.html"),
      "utf8",
    );
    expect(html).toMatch(/data-provider-state="unconfigured"/);
    // No submit-capable form: no method="post" action= inside data-role="newsletter"
    const section = html.match(
      /<section[^>]*data-role="newsletter"[\s\S]*?<\/section>/,
    );
    expect(section, "newsletter section present").not.toBeNull();
    expect(section![0]).not.toMatch(/action="https:\/\/buttondown\.com/);
    expect(section![0]).toMatch(/data-role="newsletter-preview-label"/);
    expect(section![0]).toMatch(/disabled/);
  });

  it("no PII / free-text in instrumentation descriptors", () => {
    for (const f of articles()) {
      const html = fs.readFileSync(path.join(OUT_DIR, f), "utf8");
      // Instrument descriptors are enums only.
      for (const m of html.matchAll(/data-cse-instrument-event="([^"]+)"/g)) {
        expect(m[1]).toMatch(
          /^(commercial_cta_impression|commercial_cta_click|editorial_next_step_impression|editorial_next_step_click|newsletter_impression|newsletter_submit_attempt)$/,
        );
      }
    }
  });

  it("all 12 articles remain noindex/nofollow", () => {
    const files = articles();
    expect(files.length).toBe(12);
    for (const f of files) {
      const html = fs.readFileSync(path.join(OUT_DIR, f), "utf8");
      expect(html).toMatch(/<meta name="robots" content="noindex[,\s]*nofollow"/i);
    }
  });

  it("Related module remains unique per article", () => {
    for (const f of articles()) {
      const html = fs.readFileSync(path.join(OUT_DIR, f), "utf8");
      const n = countMatches(html, /data-role="related"/g);
      expect(n, `${f} related count`).toBeLessThanOrEqual(1);
    }
  });

  it("stale causal dek remains absent", () => {
    for (const f of articles()) {
      const html = fs.readFileSync(path.join(OUT_DIR, f), "utf8");
      expect(html).not.toContain("measures why answer engines cite or ignore");
    }
  });
});
