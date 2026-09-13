import { describe, expect, it } from "vitest";
import type { ResolvedDocument } from "@/lib/content/content-loader";
import {
  countWords,
  extractHeadings,
  insightBreadcrumb,
  readingTimeMinutes,
  scoreRelated,
  shouldRenderToc,
  slugifyHeading,
} from "@/lib/content/article-derivations";

describe("slugifyHeading", () => {
  it("kebab-cases with diacritic strip", () => {
    expect(slugifyHeading("Éléphant Rouge")).toBe("elephant-rouge");
  });
  it("is idempotent", () => {
    const once = slugifyHeading("Section One!");
    expect(slugifyHeading(once)).toBe(once);
  });
  it("handles empty and single-word input", () => {
    expect(slugifyHeading("")).toBe("");
    expect(slugifyHeading("solo")).toBe("solo");
  });
  it("strips punctuation and unicode symbols", () => {
    expect(slugifyHeading("Hello, world!")).toBe("hello-world");
    expect(slugifyHeading("A — b — c")).toBe("a-b-c");
  });
  it("supports unicode diacritics generally", () => {
    expect(slugifyHeading("naïve façade")).toBe("naive-facade");
  });
});

describe("extractHeadings", () => {
  it("extracts H2 in order", () => {
    const body = "## First\n\nintro\n\n## Second\n\n## Third";
    const hs = extractHeadings(body);
    expect(hs.map((h) => h.text)).toEqual(["First", "Second", "Third"]);
    expect(hs.every((h) => h.level === 2)).toBe(true);
  });
  it("disambiguates duplicate slugs (foo, foo-2)", () => {
    const body = "## Foo\n## Foo";
    const hs = extractHeadings(body);
    expect(hs.map((h) => h.id)).toEqual(["foo", "foo-2"]);
  });
  it("ignores headings inside fenced code blocks", () => {
    const body = "## Real\n\n```\n## FakeHeading\n```\n\n## AlsoReal";
    const hs = extractHeadings(body);
    expect(hs.map((h) => h.text)).toEqual(["Real", "AlsoReal"]);
  });
  it("ignores H1 and H3 by default", () => {
    const body = "# One\n## Two\n### Three\n## Four";
    const hs = extractHeadings(body);
    expect(hs.map((h) => h.text)).toEqual(["Two", "Four"]);
  });
  it("supports H3 opt-in", () => {
    const body = "## Two\n### Three";
    const hs = extractHeadings(body, { includeH3: true });
    expect(hs.map((h) => `${h.level}:${h.text}`)).toEqual(["2:Two", "3:Three"]);
  });
});

describe("countWords", () => {
  it("counts unicode words including French accents", () => {
    expect(countWords("Éléphant naïve façade")).toBe(3);
  });
  it("ignores punctuation and whitespace", () => {
    expect(countWords("Hello, world! — done.")).toBe(3);
  });
  it("handles empty body", () => {
    expect(countWords("")).toBe(0);
  });
});

describe("readingTimeMinutes", () => {
  it("minimum 1 minute", () => {
    expect(readingTimeMinutes("only a few words")).toBe(1);
  });
  it("rounds up at 220 wpm", () => {
    const body = Array.from({ length: 221 }, () => "word").join(" ");
    expect(readingTimeMinutes(body)).toBe(2);
  });
  it("exact multiple stays at boundary", () => {
    const body = Array.from({ length: 220 }, () => "word").join(" ");
    expect(readingTimeMinutes(body)).toBe(1);
  });
});

describe("shouldRenderToc", () => {
  it("true iff ≥4 H2", () => {
    const four = [1, 2, 3, 4].map((n) => ({ level: 2 as const, text: `${n}`, id: `${n}` }));
    const three = four.slice(0, 3);
    expect(shouldRenderToc(four)).toBe(true);
    expect(shouldRenderToc(three)).toBe(false);
  });
  it("H3 do not count", () => {
    const hs = [1, 2, 3, 4, 5].map((n) => ({ level: 3 as const, text: `${n}`, id: `${n}` }));
    expect(shouldRenderToc(hs)).toBe(false);
  });
});

describe("insightBreadcrumb", () => {
  it("3-item chain TextOS → Insights → title", () => {
    expect(insightBreadcrumb("slug-a", "Title A")).toEqual([
      { label: "TextOS", href: "/" },
      { label: "Insights", href: "/insights" },
      { label: "Title A", href: "/insights/slug-a" },
    ]);
  });
});

// ── scoreRelated ──────────────────────────────────────────────────────────────────────────────

function doc(overrides: {
  slug: string;
  collection?: string;
  contentId?: string;
  title?: string;
  path?: string;
  frontmatter?: Record<string, unknown>;
}): ResolvedDocument {
  const slug = overrides.slug;
  const collection = overrides.collection ?? "insights";
  const fm = {
    title: overrides.title ?? slug,
    editorialStatus: "published",
    indexingPolicy: "index",
    capabilityIds: [],
    claimIds: [],
    ...(overrides.frontmatter ?? {}),
  };
  return {
    slug,
    collection,
    contentId: overrides.contentId ?? `${collection}:${slug}`,
    path: overrides.path ?? `/${collection}/${slug}`,
    frontmatter: fm as never,
    body: "",
    maturityLabels: [],
    ctaResolution: {} as never,
  } as unknown as ResolvedDocument;
}

describe("scoreRelated", () => {
  it("filters out self", () => {
    const target = doc({ slug: "a" });
    const result = scoreRelated({ target, candidates: [target] });
    expect(result).toEqual([]);
  });
  it("explicit relatedContentIds dominates (+50)", () => {
    const target = doc({
      slug: "a",
      frontmatter: { relatedContentIds: ["insights:b"], clusterId: "c1" },
    });
    const b = doc({ slug: "b", contentId: "insights:b" });
    const c = doc({ slug: "c", contentId: "insights:c", frontmatter: { clusterId: "c1" } });
    const result = scoreRelated({ target, candidates: [b, c] });
    expect(result[0].slug).toBe("b");
    expect(result[0].score).toBeGreaterThanOrEqual(50);
  });
  it("shared cluster +20", () => {
    const target = doc({ slug: "a", frontmatter: { clusterId: "c1" } });
    const b = doc({ slug: "b", frontmatter: { clusterId: "c1" } });
    const result = scoreRelated({ target, candidates: [b] });
    expect(result[0].score).toBe(20);
  });
  it("shared capability +10 each, claim +6 each", () => {
    const target = doc({
      slug: "a",
      frontmatter: {
        clusterId: "ct-a",
        capabilityIds: ["x", "y"],
        claimIds: ["c1"],
      },
    });
    const b = doc({
      slug: "b",
      frontmatter: {
        clusterId: "ct-b",
        capabilityIds: ["x", "y"],
        claimIds: ["c1"],
      },
    });
    const result = scoreRelated({ target, candidates: [b] });
    // 2 caps × 10 + 1 claim × 6 = 26 (no shared cluster; distinct clusterIds)
    expect(result[0].score).toBe(26);
  });
  it("same primary topic +15, else secondary +5 each", () => {
    const target = doc({
      slug: "a",
      frontmatter: {
        clusterId: "ct-a",
        primaryTopicId: "t1",
        topicIds: ["t1", "t2"],
      },
    });
    const same = doc({
      slug: "s",
      frontmatter: {
        clusterId: "ct-s",
        primaryTopicId: "t1",
        topicIds: ["t1"],
      },
    });
    const secondary = doc({
      slug: "b",
      frontmatter: {
        clusterId: "ct-b",
        primaryTopicId: "tX",
        topicIds: ["t2"],
      },
    });
    const rSame = scoreRelated({ target, candidates: [same] });
    const rSec = scoreRelated({ target, candidates: [secondary] });
    expect(rSame[0].score).toBe(15);
    expect(rSec[0].score).toBe(5);
  });
  it("deterministic tie-break: score desc, slug asc", () => {
    const target = doc({ slug: "a", frontmatter: { clusterId: "c1" } });
    const b = doc({ slug: "zzz", frontmatter: { clusterId: "c1" } });
    const c = doc({ slug: "aaa", frontmatter: { clusterId: "c1" } });
    const result = scoreRelated({ target, candidates: [b, c] });
    expect(result.map((r) => r.slug)).toEqual(["aaa", "zzz"]);
  });
});
