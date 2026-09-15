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
  editorialStatus: "draft" | "published";
  indexingPolicy: "index" | "noindex";
  firstPublishedAt: string | null;
  lastReviewedAt: string | null;
}> = {}): ResolvedDocument {
  const slug = overrides.slug ?? "sample";
  const status = overrides.editorialStatus ?? "published";
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
      editorialStatus: status,
      indexingPolicy: overrides.indexingPolicy ?? (status === "published" ? "index" : "noindex"),
      firstPublishedAt:
        overrides.firstPublishedAt === undefined
          ? status === "published"
            ? "2026-01-01"
            : null
          : overrides.firstPublishedAt,
      lastReviewedAt:
        overrides.lastReviewedAt === undefined
          ? status === "published"
            ? "2026-01-02"
            : null
          : overrides.lastReviewedAt,
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

  it("emits Person author node when authorId resolves to a Person entity", () => {
    const g = buildInsightArticleGraph({
      doc: mkDoc({ authorId: "marc-p" }),
      headings: [],
    });
    const person = g["@graph"].find(
      (n: Record<string, unknown>) => n["@type"] === "Person",
    );
    expect(person).toBeDefined();
  });

  it("emits Organization node (not Person) when authorId resolves to an Organization entity", () => {
    const g = buildInsightArticleGraph({
      doc: mkDoc({ authorId: "textos-editorial-team" }),
      headings: [],
    });
    // The publisher is always Organization at urn:textos:org — verify the AUTHOR entity
    // is emitted as an Organization node with the entity-scoped URN, not as a Person.
    const orgNodes = g["@graph"].filter(
      (n: Record<string, unknown>) => n["@type"] === "Organization",
    );
    const authorOrg = orgNodes.find(
      (n: Record<string, unknown>) => n["@id"] === "urn:textos:organization:textos-editorial-team",
    );
    expect(authorOrg).toBeDefined();
    const anyPerson = g["@graph"].find(
      (n: Record<string, unknown>) => n["@type"] === "Person",
    );
    expect(anyPerson).toBeUndefined();
  });

  it("emits WebPage (no Article) and no datePublished for DRAFT status", () => {
    const g = buildInsightArticleGraph({
      doc: mkDoc({ editorialStatus: "draft" }),
      headings: [],
    });
    const article = g["@graph"].find((n: Record<string, unknown>) =>
      ["Article", "TechArticle", "BlogPosting"].includes(n["@type"] as string),
    );
    expect(article).toBeUndefined();
    const webpage = g["@graph"].find(
      (n: Record<string, unknown>) => n["@type"] === "WebPage",
    );
    expect(webpage).toBeDefined();
    const blob = JSON.stringify(g);
    expect(blob).not.toContain("datePublished");
    expect(blob).not.toContain("dateModified");
  });

  it("throws when a published doc lacks firstPublishedAt (no publishedAt fallback)", () => {
    expect(() =>
      buildInsightArticleGraph({
        doc: mkDoc({ editorialStatus: "published", firstPublishedAt: null }),
        headings: [],
      }),
    ).toThrow(/firstPublishedAt/);
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
