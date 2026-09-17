// A3R §§7–8 — topic-hub route + sitemap indexability filter.

import { describe, expect, it, vi, afterEach } from "vitest";

vi.mock("@/lib/config/site", () => ({
  siteConfig: { origin: "https://example.invalid", allowIndexing: true },
}));

describe("A3R — sitemap 4-gate eligibility", () => {
  afterEach(() => vi.resetModules());

  it("current 12-draft corpus → 0 insight URLs in sitemap (Production semantics)", async () => {
    const mod = await import("@/app/sitemap");
    const sitemap = mod.default();
    // Homepage always ; FAQ optional ; NO insight URLs today.
    for (const entry of sitemap) {
      expect(entry.url).not.toMatch(/\/insights\//);
    }
  });

  it("when allowIndexing=false the sitemap is empty (outer fail-closed)", async () => {
    vi.doMock("@/lib/config/site", () => ({
      siteConfig: { origin: "https://example.invalid", allowIndexing: false },
    }));
    const mod = await import("@/app/sitemap");
    const sitemap = mod.default();
    expect(sitemap).toEqual([]);
  });

  it("insights index and hubs only appear when ≥1 insight is publicly eligible", async () => {
    vi.doMock("@/lib/config/site", () => ({
      siteConfig: { origin: "https://example.invalid", allowIndexing: true },
    }));
    vi.doMock("@/lib/content-surface-engine/site-integration", () => ({
      listInsightEntries: () => [
        {
          slug: "pub-1",
          kicker: "principle",
          document: {
            identity: { documentId: "textos-insight:pub-1", slug: "pub-1" },
            editorial: { topicIds: ["measurement-mechanics"] },
            truth: { publicationStatus: "published" },
            seo: { indexingIntent: "index" },
            lifecycle: { updatedAt: "2026-09-01" },
          },
        },
        {
          slug: "draft-1",
          kicker: "principle",
          document: {
            identity: { documentId: "textos-insight:draft-1", slug: "draft-1" },
            editorial: { topicIds: ["measurement-mechanics"] },
            truth: { publicationStatus: "draft" },
            seo: { indexingIntent: "noindex" },
            lifecycle: {},
          },
        },
      ],
      listGovernedTopics: () => [
        { slug: "measurement-mechanics", documentIds: ["textos-insight:pub-1", "textos-insight:draft-1"], primaryDocumentIds: ["textos-insight:pub-1"] },
        { slug: "how-we-build", documentIds: ["textos-insight:draft-1"], primaryDocumentIds: ["textos-insight:draft-1"] },
      ],
    }));
    const mod = await import("@/app/sitemap");
    const urls = mod.default().map((e) => e.url);
    expect(urls).toContain("https://example.invalid/insights");
    expect(urls).toContain("https://example.invalid/insights/pub-1");
    // Draft article NEVER enters sitemap.
    expect(urls).not.toContain("https://example.invalid/insights/draft-1");
    // Topic hub for measurement-mechanics : has 1 public doc ⇒ INCLUDED.
    expect(urls).toContain("https://example.invalid/insights/topic/measurement-mechanics");
    // Topic hub for how-we-build : only draft ⇒ EXCLUDED.
    expect(urls).not.toContain("https://example.invalid/insights/topic/how-we-build");
    // Each URL appears exactly once.
    const dupes = urls.filter((u, i) => urls.indexOf(u) !== i);
    expect(dupes).toEqual([]);
  });
});
