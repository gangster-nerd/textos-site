import { describe, expect, it } from "vitest";
import type { ResolvedDocument } from "@/lib/content/content-loader";
import { buildInsightArticleGraph } from "@/lib/schema-org/build-article-graph";
import { siteConfig } from "@/lib/config/site";

function mkDoc(overrides: Partial<{
  slug: string;
  contentId: string;
  authorId: string;
  primaryTopicId: string;
  body: string;
}> = {}): ResolvedDocument {
  const slug = overrides.slug ?? "sample";
  return {
    slug,
    collection: "insights",
    contentId: overrides.contentId ?? `insights:${slug}`,
    path: `/insights/${slug}`,
    frontmatter: {
      title: "Sample Title",
      description: "Sample description.",
      language: "en",
      publishedAt: "2026-01-01",
      updatedAt: "2026-01-02",
      firstPublishedAt: "2026-01-01",
      schemaType: "TechArticle",
      authorId: overrides.authorId ?? "textos-editorial-team",
      primaryTopicId: overrides.primaryTopicId ?? "measurement-mechanics",
    } as never,
    body: overrides.body ?? "Body one two three.",
    maturityLabels: [],
  } as unknown as ResolvedDocument;
}

describe("buildInsightArticleGraph", () => {
  it("returns @context + @graph", () => {
    const g = buildInsightArticleGraph({ doc: mkDoc(), headings: [] });
    expect(g["@context"]).toBe("https://schema.org");
    expect(Array.isArray(g["@graph"])).toBe(true);
  });

  it("contains Organization node with @id urn:textos:org", () => {
    const g = buildInsightArticleGraph({ doc: mkDoc(), headings: [] });
    const org = g["@graph"].find(
      (n: Record<string, unknown>) => n["@type"] === "Organization",
    );
    expect(org).toBeDefined();
    expect((org as Record<string, unknown>)["@id"]).toBe("urn:textos:org");
  });

  it("contains BreadcrumbList with 3 itemListElement", () => {
    const g = buildInsightArticleGraph({ doc: mkDoc(), headings: [] });
    const bc = g["@graph"].find(
      (n: Record<string, unknown>) => n["@type"] === "BreadcrumbList",
    ) as Record<string, unknown> | undefined;
    expect(bc).toBeDefined();
    expect((bc!.itemListElement as unknown[]).length).toBe(3);
  });

  it("contains Article/TechArticle node with required fields", () => {
    const g = buildInsightArticleGraph({ doc: mkDoc(), headings: [] });
    const article = g["@graph"].find((n: Record<string, unknown>) =>
      ["Article", "TechArticle", "BlogPosting"].includes(n["@type"] as string),
    ) as Record<string, unknown> | undefined;
    expect(article).toBeDefined();
    expect(article!["@id"]).toBeDefined();
    expect(article!.headline).toBeDefined();
    expect(article!.datePublished).toBeDefined();
    expect(article!.dateModified).toBeDefined();
    expect(article!.wordCount).toBeDefined();
  });

  it("omits url and mainEntityOfPage when allowIndexing is false", () => {
    // In the current dev/test environment, allowIndexing is false.
    // Skip the assertion if indexing is somehow on.
    if (siteConfig.allowIndexing) return;
    const g = buildInsightArticleGraph({ doc: mkDoc(), headings: [] });
    const article = g["@graph"].find((n: Record<string, unknown>) =>
      ["Article", "TechArticle", "BlogPosting"].includes(n["@type"] as string),
    ) as Record<string, unknown>;
    expect(article.url).toBeUndefined();
    expect(article.mainEntityOfPage).toBeUndefined();
  });

  it("emits Person author node when authorId resolves", () => {
    const g = buildInsightArticleGraph({
      doc: mkDoc({ authorId: "marc-p" }),
      headings: [],
    });
    const person = g["@graph"].find(
      (n: Record<string, unknown>) => n["@type"] === "Person",
    );
    expect(person).toBeDefined();
  });

  it("breadcrumb items drop `item` when origin absent (no undefined property)", () => {
    if (siteConfig.allowIndexing) return;
    const g = buildInsightArticleGraph({ doc: mkDoc(), headings: [] });
    const bc = g["@graph"].find(
      (n: Record<string, unknown>) => n["@type"] === "BreadcrumbList",
    ) as Record<string, unknown>;
    for (const it of bc.itemListElement as Array<Record<string, unknown>>) {
      expect("item" in it).toBe(false);
    }
  });
});
