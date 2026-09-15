// CTO §11 — Link-graph tests that would previously have been "0 orphans of 0 published"
// vacuous truths. Here we assemble a corpus with actual published documents so the gate
// has something real to fail on when the code is wrong.

import { describe, expect, it } from "vitest";
import type { ResolvedDocument } from "@/lib/content/content-loader";
import { buildLinkGraph, proposeBacklinkCandidates } from "@/lib/content/link-graph";

function mk(o: {
  contentId: string;
  slug: string;
  collection?: string;
  path?: string;
  title?: string;
  editorialStatus?: "draft" | "review" | "published" | "archived";
  indexingPolicy?: "index" | "noindex";
  body?: string;
  capabilityIds?: string[];
  claimIds?: string[];
  topicIds?: string[];
}): ResolvedDocument {
  const collection = o.collection ?? "insights";
  return {
    contentId: o.contentId,
    slug: o.slug,
    collection,
    path: o.path ?? `/${collection}/${o.slug}`,
    frontmatter: {
      title: o.title ?? o.slug,
      editorialStatus: o.editorialStatus ?? "published",
      indexingPolicy: o.indexingPolicy ?? "index",
      capabilityIds: o.capabilityIds ?? [],
      claimIds: o.claimIds ?? [],
      topicIds: o.topicIds ?? [],
    } as never,
    body: o.body ?? "",
  } as unknown as ResolvedDocument;
}

describe("link-graph non-vacuous (published fixtures)", () => {
  it("published article with zero inbound is reported as orphan", () => {
    // Three published articles. `a` and `b` link to each other. `orphan` is linked by
    // nobody. If the orphan detection were broken (returning [] on any corpus) this
    // assertion would fail.
    const a = mk({
      contentId: "insights:a",
      slug: "a",
      body: "See [b](/insights/b).",
    });
    const b = mk({
      contentId: "insights:b",
      slug: "b",
      body: "See [a](/insights/a).",
    });
    const orphan = mk({
      contentId: "insights:orphan",
      slug: "orphan",
    });
    const g = buildLinkGraph([a, b, orphan]);
    expect(g.orphanPublished).toContain("insights:orphan");
    expect(g.orphanPublished).not.toContain("insights:a");
    expect(g.orphanPublished).not.toContain("insights:b");
  });

  it("adding a backlink clears the orphan", () => {
    const orphan = mk({ contentId: "insights:orphan", slug: "orphan" });
    const linker = mk({
      contentId: "insights:linker",
      slug: "linker",
      body: "See [the orphan](/insights/orphan).",
    });
    const g = buildLinkGraph([orphan, linker]);
    expect(g.orphanPublished).not.toContain("insights:orphan");
  });

  it("published → draft link is rejected as target-not-published", () => {
    const pub = mk({
      contentId: "insights:pub",
      slug: "pub",
      body: "See [draft](/insights/wip).",
    });
    const draft = mk({
      contentId: "insights:wip",
      slug: "wip",
      editorialStatus: "draft",
      indexingPolicy: "noindex",
    });
    const g = buildLinkGraph([pub, draft]);
    expect(
      g.brokenLinks.some(
        (b) => b.from === "insights:pub" && b.reason === "target-not-published",
      ),
    ).toBe(true);
  });

  it("draft → draft link is NOT reported as broken (preview navigation is legitimate)", () => {
    const a = mk({
      contentId: "insights:a",
      slug: "a",
      editorialStatus: "draft",
      indexingPolicy: "noindex",
      body: "See [b](/insights/b).",
    });
    const b = mk({
      contentId: "insights:b",
      slug: "b",
      editorialStatus: "draft",
      indexingPolicy: "noindex",
    });
    const g = buildLinkGraph([a, b]);
    expect(
      g.brokenLinks.some((br) => br.from === "insights:a" && br.reason === "target-not-published"),
    ).toBe(false);
  });

  it("nonexistent topic hub now fails (regex whitelist was removed)", () => {
    // Before CTC-ARTICLE-SYSTEM-1 corrections, /insights/topic/anything matched a
    // regex whitelist and never surfaced as a broken link. That regex is gone : only
    // real hubSlug values (derived from topic-registry) are accepted.
    const a = mk({
      contentId: "insights:a",
      slug: "a",
      body: "Visit our thoughts on [nonsense](/insights/topic/nonsense-topic).",
    });
    const g = buildLinkGraph([a]);
    expect(
      g.brokenLinks.some(
        (b) => b.reason === "unknown-route" && b.href === "/insights/topic/nonsense-topic",
      ),
    ).toBe(true);
  });

  it("existing topic hub is accepted", () => {
    const a = mk({
      contentId: "insights:a",
      slug: "a",
      body: "See [authority observation](/insights/topic/authority-observation).",
    });
    const g = buildLinkGraph([a]);
    // Zero broken links for the hub reference (may be orphan-published — unrelated).
    expect(
      g.brokenLinks.filter((b) => b.href === "/insights/topic/authority-observation"),
    ).toEqual([]);
  });

  it("app-route whitelist cannot conceal a real content 404", () => {
    // The whitelist only covers static app routes (`/request-measurement`, …). A link
    // to `/insights/no-such-article` is a CONTENT link : it must resolve to a loaded
    // document or fail. Adding a garbage insights link cannot be silently swallowed.
    const a = mk({
      contentId: "insights:a",
      slug: "a",
      body: "See [ghost](/insights/no-such-article).",
    });
    const g = buildLinkGraph([a]);
    expect(
      g.brokenLinks.some(
        (b) => b.reason === "unknown-route" && b.href === "/insights/no-such-article",
      ),
    ).toBe(true);
  });

  it("duplicate slug across collections is reported", () => {
    const a = mk({ contentId: "insights:x", slug: "x", collection: "insights" });
    const b = mk({
      contentId: "faq:x",
      slug: "x",
      collection: "faq",
      path: "/faq/x",
    });
    const g = buildLinkGraph([a, b]);
    expect(g.slugDuplicates).toContain("x");
  });

  it("proposeBacklinkCandidates: skips existing linkers and self", () => {
    const target = mk({
      contentId: "insights:new",
      slug: "new",
      editorialStatus: "draft",
      indexingPolicy: "noindex",
      topicIds: ["measurement-mechanics"],
      capabilityIds: ["cap-a"],
      claimIds: ["m1"],
    });
    const alreadyLinks = mk({
      contentId: "insights:linker",
      slug: "linker",
      topicIds: ["measurement-mechanics"],
      capabilityIds: ["cap-a"],
      body: "See [/insights/new](/insights/new).",
    });
    const eligible = mk({
      contentId: "insights:elig",
      slug: "elig",
      topicIds: ["measurement-mechanics"],
      capabilityIds: ["cap-a"],
      claimIds: ["m1"],
      body: "No link to the new article yet.",
    });
    const candidates = proposeBacklinkCandidates({
      newDoc: target,
      existingDocs: [target, alreadyLinks, eligible],
    });
    expect(candidates.map((c) => c.existingArticleContentId)).toEqual(["insights:elig"]);
    // Every candidate is flagged for human review — no auto-publish.
    for (const c of candidates) expect(c.humanReviewRequired).toBe(true);
  });

  it("determinism : same input twice ⇒ identical output shape", () => {
    const corpus = [
      mk({ contentId: "insights:a", slug: "a", body: "[b](/insights/b)" }),
      mk({ contentId: "insights:b", slug: "b" }),
      mk({ contentId: "insights:c", slug: "c" }),
    ];
    const g1 = buildLinkGraph(corpus);
    const g2 = buildLinkGraph(corpus);
    expect(JSON.stringify(g1)).toBe(JSON.stringify(g2));
  });
});
