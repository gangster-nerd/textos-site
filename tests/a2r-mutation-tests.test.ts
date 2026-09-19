// A2R-PORT §15 — non-vacuous HTML output mutation tests.
//
// Every assertion here exercises actual rendered output. If `out/` is missing,
// the test FAILS explicitly — never `describe.skipIf`.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.resolve("out/insights");

if (!fs.existsSync(OUT_DIR)) {
  throw new Error(
    "A2R HTML tests require `pnpm build` output at out/insights. Run `pnpm build` " +
      "then re-run this test (or use `pnpm verify:a2r` which builds first).",
  );
}

const richArticle = path.join(OUT_DIR, "graduated-publication.html");
const draftArticleFiles = fs
  .readdirSync(OUT_DIR)
  .filter((f) => f.endsWith(".html"))
  .sort();

// CMO-CONVERSION-SURFACE-2 : the authority-intelligence article now carries
// the MEASURE_BRAND intent (governed field change authorised for this article
// only — see task brief). It therefore joins the CTA cohort.
const CTA_ARTICLES = [
  "authority-intelligence-not-ai-seo",
  "brief-to-decision-economics",
  "graduated-publication",
  "no-affirmation-without-evidence",
  "observatory-not-cms",
  "opportunity-brief-deterministic",
  "three-dimensions-authority-presence",
  "three-measures-never-one-score",
  "truthcheck-unmovable-gate",
];
// authority-intelligence has a body-flow cta_slot; the remaining NO_CTA
// articles genuinely have no authorised intent → zero article-local
// commercial CTAs (editorial next step is checked separately).
const NO_CTA_ARTICLES = [
  "agent-protocol-immutable-frontiers",
  "north-star-brief-acceptance",
  "observation-not-optimization",
];

function readHtml(slug: string): string {
  return fs.readFileSync(path.join(OUT_DIR, `${slug}.html`), "utf8");
}

describe("A2R — HTML structural invariants (rich article: graduated-publication)", () => {
  const html = fs.readFileSync(richArticle, "utf8");

  it("contains multiple <p> paragraphs (dropped-paragraph mutation)", () => {
    const count = (html.match(/<p[\s>]/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(6);
  });
  it("renders <strong> at least once", () => {
    expect(/<strong>/.test(html)).toBe(true);
  });
  it("renders <em> at least once", () => {
    expect(/<em>/.test(html)).toBe(true);
  });
  it("renders <code> at least once", () => {
    expect(/<code[\s>]/.test(html)).toBe(true);
  });
  it("renders both <ol> and <ul>", () => {
    expect(/<ol[\s>]/.test(html)).toBe(true);
    expect(/<ul[\s>]/.test(html)).toBe(true);
  });
  it("renders <blockquote> somewhere in the corpus (brief-to-decision-economics leads with one)", () => {
    const briefHtml = readHtml("brief-to-decision-economics");
    expect(/<blockquote>/.test(briefHtml)).toBe(true);
  });
  it("ToC anchor fragments each resolve to exactly one h2 id", () => {
    const tocMatch = html.match(
      /<nav[^>]+aria-label="Table of contents"[^>]*>[\s\S]*?<\/nav>/,
    );
    expect(tocMatch, "ToC nav missing").not.toBeNull();
    const fragments = [...tocMatch![0].matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
    expect(fragments.length).toBeGreaterThan(0);
    for (const f of fragments) {
      const idMatches = [
        ...html.matchAll(new RegExp(`<h[2-6]\\s[^>]*id="${f}"`, "g")),
      ];
      expect(
        idMatches.length,
        `ToC fragment #${f} expected one heading id, got ${idMatches.length}`,
      ).toBe(1);
    }
  });
});

describe("A2R — author identity across all 12 articles", () => {
  it.each(draftArticleFiles)(
    "%s : Marc Prempain byline + /authors/marc-prempain link",
    (file) => {
      const html = fs.readFileSync(path.join(OUT_DIR, file), "utf8");
      expect(html).toMatch(/Marc Prempain/);
      expect(html).toMatch(/href="\/authors\/marc-prempain"/);
      // The old placeholder "TextOS Editorial Team" MUST NOT appear as author.
      // Narrow-window search : within the surface byline block.
      const bylineMatch = html.match(
        /<p class="cse-surface__byline">[\s\S]*?<\/p>/,
      );
      expect(bylineMatch).not.toBeNull();
      expect(bylineMatch![0]).not.toMatch(/TextOS Editorial Team/);
    },
  );
});

// CMO-CONVERSION-SURFACE-2 : the 8 pre-existing CTA articles carry a body
// `cta_slot` and therefore emit contextual + final. The authority-intelligence
// article has no `cta_slot` in its body → header + final, no contextual.
const CTA_ARTICLES_WITH_CTA_SLOT = CTA_ARTICLES.filter(
  (s) => s !== "authority-intelligence-not-ai-seo",
);

describe("A2R — CTA counts + positions", () => {
  it.each(CTA_ARTICLES_WITH_CTA_SLOT)(
    "%s : exactly 1 contextual + 1 final CTA",
    (slug) => {
      const html = readHtml(slug);
      const contextual = (html.match(/data-cse-cta-position="contextual"/g) ?? []).length;
      const finalCta = (html.match(/data-cse-cta-position="final"/g) ?? []).length;
      expect(contextual, `${slug} contextual count`).toBe(1);
      expect(finalCta, `${slug} final count`).toBe(1);
      // Ordering : contextual MUST precede final in the DOM.
      const cxIdx = html.indexOf('data-cse-cta-position="contextual"');
      const fnIdx = html.indexOf('data-cse-cta-position="final"');
      expect(cxIdx).toBeGreaterThan(-1);
      expect(fnIdx).toBeGreaterThan(cxIdx);
    },
  );

  it("authority-intelligence-not-ai-seo : header + final commercial CTAs (no cta_slot)", () => {
    const html = readHtml("authority-intelligence-not-ai-seo");
    expect((html.match(/data-cse-cta-slot="header"/g) ?? []).length).toBe(1);
    expect((html.match(/data-cse-cta-slot="final"/g) ?? []).length).toBe(1);
    expect((html.match(/data-cse-cta-slot="contextual"/g) ?? []).length).toBe(0);
  });

  it.each(NO_CTA_ARTICLES)("%s : zero CTAs (no authorised intent)", (slug) => {
    const html = readHtml(slug);
    const total = (html.match(/data-cse-cta-position=/g) ?? []).length;
    expect(total).toBe(0);
  });
});

describe("A2R — CTA attribution URL", () => {
  it.each(CTA_ARTICLES_WITH_CTA_SLOT)("%s : href contains source, contentId, ctaVariant, ctaVersion, position, contentRevision", (slug) => {
    const html = readHtml(slug);
    // Extract every anchor and pick the ones whose class list mentions
    // cse-surface__cta-action. React-serialized payload strings escape quotes
    // (e.g. `\"`) so a permissive attribute walk is more robust than a class-first
    // regex.
    const anchors = [...html.matchAll(/<a\s[^>]*?href="([^"]+)"[^>]*>/g)]
      .map((m) => ({ tag: m[0], href: m[1] }))
      .filter((a) => a.tag.includes("cse-surface__cta-action"));
    expect(anchors.length, `${slug}: found ${anchors.length} CTA anchors`).toBe(2);
    for (const { href } of anchors) {
      // Decode HTML entities so URLSearchParams sees real `&`.
      const decoded = href.replace(/&amp;/g, "&");
      const url = new URL(decoded, "https://example.invalid");
      expect(url.searchParams.get("source")).toBe("textos-site");
      expect(url.searchParams.get("contentId")).toMatch(/textos-insight/);
      expect(url.searchParams.get("ctaVariant")).toBeTruthy();
      expect(url.searchParams.get("ctaVersion")).toBeTruthy();
      expect(url.searchParams.get("position")).toMatch(/^(contextual|final)$/);
      expect(url.searchParams.get("contentRevision")).toBeTruthy();
    }
    const positions = anchors
      .map(({ href }) =>
        new URL(href.replace(/&amp;/g, "&"), "https://example.invalid").searchParams.get(
          "position",
        ),
      )
      .sort();
    expect(positions).toEqual(["contextual", "final"]);
  });
});

describe("A2R — related content resolved (never raw ids)", () => {
  it.each(draftArticleFiles)("%s : related list has resolved titles + hrefs", (file) => {
    const html = fs.readFileSync(path.join(OUT_DIR, file), "utf8");
    const relatedNav = html.match(
      /<nav class="cse-surface__related"[^>]*>[\s\S]*?<\/nav>/,
    );
    // Every draft article has at least one related peer (shared topic / claim).
    expect(relatedNav, `${file}: related nav missing`).not.toBeNull();
    // No raw documentId shape leaks as text content in the list.
    const idInText = /<li[^>]*>textos-insight:/.test(relatedNav![0]);
    expect(idInText, `${file}: raw related id leaked as text`).toBe(false);
    // At least one link to another /insights/ target.
    const linkCount = (relatedNav![0].match(/href="\/insights\/[a-z-]+"/g) ?? []).length;
    expect(linkCount).toBeGreaterThan(0);
  });
});

describe("A2R — social image + draft honesty", () => {
  it.each(draftArticleFiles)("%s : DRAFT banner + no datePublished/dateModified in JSON-LD", (file) => {
    const html = fs.readFileSync(path.join(OUT_DIR, file), "utf8");
    expect(html).toMatch(/DRAFT · NOT PUBLIC/);
    const ld = [
      ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
    ]
      .map((m) => m[1])
      .join("\n");
    expect(ld).not.toMatch(/"datePublished"/);
    expect(ld).not.toMatch(/"dateModified"/);
  });
});

describe("A2R — social image assets exist for all 12", () => {
  const svgDir = path.resolve("public/og/insights");
  it.each(draftArticleFiles)("%s : matching /og/insights/<slug>.svg exists", (file) => {
    const slug = file.replace(/\.html$/, "");
    expect(fs.existsSync(path.join(svgDir, `${slug}.svg`))).toBe(true);
  });
});

describe("A2R — breadcrumb includes Insights", () => {
  it.each(draftArticleFiles)("%s : breadcrumb TextOS → Insights → title", (file) => {
    const html = fs.readFileSync(path.join(OUT_DIR, file), "utf8");
    const bc = html.match(
      /<nav class="cse-surface__breadcrumbs"[^>]*>[\s\S]*?<\/nav>/,
    );
    expect(bc).not.toBeNull();
    expect(bc![0]).toMatch(/href="\/"/);
    expect(bc![0]).toMatch(/href="\/insights"/);
    expect(bc![0]).toMatch(/aria-current="page"/);
  });
});
