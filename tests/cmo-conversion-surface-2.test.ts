// CMO-CONVERSION-SURFACE-2 — acceptance invariants for the derived
// conversion plan. Runs against `out/insights/*.html` when present.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { conversionConfig } from "@/lib/conversion/conversion-config";
import { listInsightEntries } from "@/lib/content-surface-engine/site-integration/insights-catalog";

const OUT_DIR = path.resolve("out/insights");
const hasBuild = fs.existsSync(OUT_DIR);

// Portage PR #22 sur main : la cohorte commerciale est tirée des documents (et non plus d'une liste
// figée de 12 articles) et soumise à la porte de livraison de main. En mode `off`, aucun article ne
// porte de CTA commercial ; les notes Commit-to-Content (`textos-site:ctc:`) n'en portent jamais
// (décision CPO-2026-09-12 : cta = none, conversionAllowed = false).
const CTA_DELIVERED = !conversionConfig.isOff;
const ENTRIES = listInsightEntries();
const COMMERCIAL_SLUGS = new Set<string>(
  ENTRIES.filter(
    (e) => e.document.conversion.conversionAllowed && Boolean(e.document.conversion.ctaIntentId),
  ).map((e) => e.slug),
);
const CTC_SLUGS = ENTRIES.filter((e) =>
  e.document.identity.documentId.startsWith("textos-site:ctc:"),
).map((e) => e.slug);

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
      if (!CTA_DELIVERED || !COMMERCIAL_SLUGS.has(slug)) {
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

  it("Commit-to-Content notes never carry a commercial CTA (any mode)", () => {
    expect(CTC_SLUGS.length).toBeGreaterThan(0);
    for (const slug of CTC_SLUGS) {
      const entry = ENTRIES.find((e) => e.slug === slug)!;
      expect(entry.document.conversion.conversionAllowed, slug).toBe(false);
      const html = fs.readFileSync(path.join(OUT_DIR, `${slug}.html`), "utf8");
      expect(countMatches(html, /data-cse-cta-slot=/g), `${slug} cta slots`).toBe(0);
      expect(countMatches(html, /data-cse-cta-position=/g), `${slug} cta positions`).toBe(0);
      expect(html, slug).not.toContain("/request-measurement");
    }
  });

  it.runIf(CTA_DELIVERED)("authority-intelligence article now carries a first-measurement CTA", () => {
    const html = fs.readFileSync(
      path.join(OUT_DIR, "authority-intelligence-not-ai-seo.html"),
      "utf8",
    );
    expect(html).toMatch(/data-cse-cta-slot="header"/);
    expect(html).toMatch(/data-cse-cta-slot="final"/);
    expect(html).toMatch(/href="\/request-measurement\?source=textos-site&amp;/);
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
    // Every commercial article carries the honest label + the real
    // destination side-by-side (attributed href). Neither ever appears with the stale label.
    if (!CTA_DELIVERED) return;
    let hits = 0;
    for (const f of articles()) {
      const html = fs.readFileSync(path.join(OUT_DIR, f), "utf8");
      if (
        html.includes("Request your first measurement") &&
        html.includes('href="/request-measurement?source=textos-site&amp;')
      ) {
        hits += 1;
      }
    }
    expect(hits, "commercial articles binding label ↔ destination").toBe(COMMERCIAL_SLUGS.size);
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

  it("every insights page (managed corpus + CTC notes) remains noindex/nofollow", () => {
    const files = articles();
    expect(files.length).toBe(ENTRIES.length);
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
