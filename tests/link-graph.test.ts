import { describe, expect, it } from "vitest";
import type { ResolvedDocument } from "@/lib/content/content-loader";
import { buildLinkGraph } from "@/lib/content/link-graph";

function mk(overrides: {
  contentId: string;
  slug: string;
  collection?: string;
  path?: string;
  title?: string;
  editorialStatus?: "draft" | "review" | "published" | "archived";
  indexingPolicy?: "index" | "noindex";
  body?: string;
}): ResolvedDocument {
  const collection = overrides.collection ?? "insights";
  return {
    contentId: overrides.contentId,
    slug: overrides.slug,
    collection,
    path: overrides.path ?? `/${collection}/${overrides.slug}`,
    frontmatter: {
      title: overrides.title ?? overrides.slug,
      editorialStatus: overrides.editorialStatus ?? "draft",
      indexingPolicy: overrides.indexingPolicy ?? "noindex",
    } as never,
    body: overrides.body ?? "",
  } as unknown as ResolvedDocument;
}

describe("buildLinkGraph", () => {
  it("flags unknown-route for content link to nonexistent path", () => {
    const a = mk({
      contentId: "insights:a",
      slug: "a",
      editorialStatus: "published",
      indexingPolicy: "index",
      body: "See [broken](/insights/nonexistent).",
    });
    const g = buildLinkGraph([a]);
    expect(
      g.brokenLinks.some(
        (b) => b.reason === "unknown-route" && b.href === "/insights/nonexistent",
      ),
    ).toBe(true);
  });

  it("does not flag whitelisted app route /request-measurement", () => {
    const a = mk({
      contentId: "insights:a",
      slug: "a",
      body: "Ask [measurement](/request-measurement).",
    });
    const g = buildLinkGraph([a]);
    expect(g.brokenLinks.some((b) => b.href === "/request-measurement")).toBe(false);
  });

  it("does not flag whitelisted topic hub route", () => {
    const a = mk({
      contentId: "insights:a",
      slug: "a",
      body: "See [hub](/insights/topic/authority-observation).",
    });
    const g = buildLinkGraph([a]);
    expect(
      g.brokenLinks.some((b) => b.href === "/insights/topic/authority-observation"),
    ).toBe(false);
  });

  it("detects self-link", () => {
    const a = mk({
      contentId: "insights:a",
      slug: "a",
      body: "See [me](/insights/a).",
    });
    const g = buildLinkGraph([a]);
    expect(g.brokenLinks.some((b) => b.reason === "self-link")).toBe(true);
  });

  it("target-not-published fires when PUBLISHED indexable linker points at DRAFT", () => {
    const a = mk({
      contentId: "insights:a",
      slug: "a",
      editorialStatus: "published",
      indexingPolicy: "index",
      body: "See [draft](/insights/b).",
    });
    const b = mk({
      contentId: "insights:b",
      slug: "b",
      editorialStatus: "draft",
      indexingPolicy: "noindex",
    });
    const g = buildLinkGraph([a, b]);
    expect(
      g.brokenLinks.some(
        (bl) => bl.reason === "target-not-published" && bl.from === "insights:a",
      ),
    ).toBe(true);
  });

  it("draft linker → draft target produces NO failure", () => {
    const a = mk({
      contentId: "insights:a",
      slug: "a",
      editorialStatus: "draft",
      indexingPolicy: "noindex",
      body: "See [draft](/insights/b).",
    });
    const b = mk({
      contentId: "insights:b",
      slug: "b",
      editorialStatus: "draft",
      indexingPolicy: "noindex",
    });
    const g = buildLinkGraph([a, b]);
    expect(g.brokenLinks.some((bl) => bl.reason === "target-not-published")).toBe(false);
  });

  it("orphanPublished only reports published+indexable with 0 inbound", () => {
    const orphan = mk({
      contentId: "insights:orphan",
      slug: "orphan",
      editorialStatus: "published",
      indexingPolicy: "index",
    });
    const draftOrphan = mk({
      contentId: "insights:d",
      slug: "d",
      editorialStatus: "draft",
      indexingPolicy: "noindex",
    });
    const g = buildLinkGraph([orphan, draftOrphan]);
    expect(g.orphanPublished).toContain("insights:orphan");
    expect(g.orphanPublished).not.toContain("insights:d");
  });

  it("detects slug duplicates", () => {
    const a1 = mk({ contentId: "insights:a", slug: "same", path: "/insights/same" });
    const a2 = mk({
      contentId: "methodology:a",
      slug: "same",
      collection: "methodology",
      path: "/methodology/same",
    });
    const g = buildLinkGraph([a1, a2]);
    expect(g.slugDuplicates).toContain("same");
  });

  it("detects canonical (path) duplicates", () => {
    const a1 = mk({ contentId: "x:1", slug: "a", path: "/dup" });
    const a2 = mk({ contentId: "x:2", slug: "b", path: "/dup" });
    const g = buildLinkGraph([a1, a2]);
    expect(g.canonicalDuplicates).toContain("/dup");
  });

  it("is deterministic (same input → identical output)", () => {
    const docs = [
      mk({
        contentId: "insights:a",
        slug: "a",
        editorialStatus: "published",
        indexingPolicy: "index",
        body: "See [b](/insights/b).",
      }),
      mk({
        contentId: "insights:b",
        slug: "b",
        editorialStatus: "published",
        indexingPolicy: "index",
        body: "back to [a](/insights/a).",
      }),
    ];
    const g1 = buildLinkGraph(docs);
    const g2 = buildLinkGraph(docs);
    expect(JSON.stringify(g1)).toBe(JSON.stringify(g2));
  });
});
