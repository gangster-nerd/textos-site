import { describe, expect, it } from "vitest";
import type { ResolvedDocument } from "@/lib/content/content-loader";
import { proposeBacklinkCandidates } from "@/lib/content/link-graph";

function mk(overrides: {
  contentId: string;
  slug: string;
  collection?: string;
  path?: string;
  title?: string;
  editorialStatus?: "draft" | "review" | "published" | "archived";
  body?: string;
  frontmatter?: Record<string, unknown>;
}): ResolvedDocument {
  const collection = overrides.collection ?? "insights";
  return {
    contentId: overrides.contentId,
    slug: overrides.slug,
    collection,
    path: overrides.path ?? `/${collection}/${overrides.slug}`,
    frontmatter: {
      title: overrides.title ?? overrides.slug,
      editorialStatus: overrides.editorialStatus ?? "published",
      indexingPolicy: "index",
      capabilityIds: [],
      claimIds: [],
      ...(overrides.frontmatter ?? {}),
    } as never,
    body: overrides.body ?? "",
  } as unknown as ResolvedDocument;
}

describe("proposeBacklinkCandidates", () => {
  it("skips self", () => {
    const d = mk({
      contentId: "insights:a",
      slug: "a",
      frontmatter: { topicIds: ["t1"] },
    });
    const out = proposeBacklinkCandidates({ newDoc: d, existingDocs: [d] });
    expect(out).toEqual([]);
  });

  it("skips existing docs that already link to newDoc", () => {
    const newDoc = mk({
      contentId: "insights:new",
      slug: "new",
      frontmatter: { topicIds: ["t1"] },
    });
    const existing = mk({
      contentId: "insights:e",
      slug: "e",
      body: "Already linking to [it](/insights/new).",
      frontmatter: { topicIds: ["t1"] },
    });
    const out = proposeBacklinkCandidates({ newDoc, existingDocs: [existing] });
    expect(out).toEqual([]);
  });

  it("skips drafts (only proposes on published existing)", () => {
    const newDoc = mk({
      contentId: "insights:new",
      slug: "new",
      frontmatter: { topicIds: ["t1"] },
    });
    const draft = mk({
      contentId: "insights:d",
      slug: "d",
      editorialStatus: "draft",
      frontmatter: { topicIds: ["t1"] },
    });
    const out = proposeBacklinkCandidates({ newDoc, existingDocs: [draft] });
    expect(out).toEqual([]);
  });

  it("always sets humanReviewRequired: true", () => {
    const newDoc = mk({
      contentId: "insights:new",
      slug: "new",
      frontmatter: { topicIds: ["t1"] },
    });
    const existing = mk({
      contentId: "insights:e",
      slug: "e",
      frontmatter: { topicIds: ["t1"] },
    });
    const out = proposeBacklinkCandidates({ newDoc, existingDocs: [existing] });
    expect(out).toHaveLength(1);
    expect(out[0].humanReviewRequired).toBe(true);
  });

  it("confidence ladder: 1→low, 2→medium, ≥3→high", () => {
    const newDoc = mk({
      contentId: "insights:new",
      slug: "new",
      frontmatter: {
        topicIds: ["t1"],
        capabilityIds: ["c1", "c2"],
        claimIds: ["cl1"],
      },
    });
    const one = mk({
      contentId: "insights:one",
      slug: "one",
      frontmatter: { topicIds: ["t1"] },
    });
    const two = mk({
      contentId: "insights:two",
      slug: "two",
      frontmatter: { topicIds: ["t1"], capabilityIds: ["c1"] },
    });
    const three = mk({
      contentId: "insights:three",
      slug: "three",
      frontmatter: {
        topicIds: ["t1"],
        capabilityIds: ["c1", "c2"],
        claimIds: ["cl1"],
      },
    });
    const outOne = proposeBacklinkCandidates({ newDoc, existingDocs: [one] });
    const outTwo = proposeBacklinkCandidates({ newDoc, existingDocs: [two] });
    const outThree = proposeBacklinkCandidates({ newDoc, existingDocs: [three] });
    expect(outOne[0].confidence).toBe("low");
    expect(outTwo[0].confidence).toBe("medium");
    expect(outThree[0].confidence).toBe("high");
  });

  it("sort order: confidence desc, contentId asc", () => {
    const newDoc = mk({
      contentId: "insights:new",
      slug: "new",
      frontmatter: {
        topicIds: ["t1"],
        capabilityIds: ["c1", "c2"],
        claimIds: ["cl1"],
      },
    });
    const lowZ = mk({
      contentId: "insights:zzz",
      slug: "zzz",
      frontmatter: { topicIds: ["t1"] },
    });
    const highB = mk({
      contentId: "insights:bbb",
      slug: "bbb",
      frontmatter: {
        topicIds: ["t1"],
        capabilityIds: ["c1", "c2"],
        claimIds: ["cl1"],
      },
    });
    const highA = mk({
      contentId: "insights:aaa",
      slug: "aaa",
      frontmatter: {
        topicIds: ["t1"],
        capabilityIds: ["c1", "c2"],
        claimIds: ["cl1"],
      },
    });
    const out = proposeBacklinkCandidates({
      newDoc,
      existingDocs: [lowZ, highB, highA],
    });
    expect(out.map((c) => c.existingArticleContentId)).toEqual([
      "insights:aaa",
      "insights:bbb",
      "insights:zzz",
    ]);
  });
});
