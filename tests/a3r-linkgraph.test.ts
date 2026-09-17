// A3R §6 — LinkGraph re-certification.
//
// Confirms the deterministic LinkGraph on main is still correct AND that the
// PUBLIC target eligibility rule holds : only documents whose id is in the
// caller-supplied `indexableIds` set may appear as a related target. With the
// current 12-draft corpus and an EMPTY indexable set (no article is
// indexable), the public link graph must yield zero targets.
//
// Backlink candidates remain REPORT_ONLY : the function returns candidates but
// never mutates content, files, or the graph.

import { describe, expect, it } from "vitest";

import type { ContentDocument } from "@/lib/content-surface-engine/contract/content-document";
import { loadManagedCorpus } from "@/lib/content-surface-engine/conformance/corpus-loader";
import {
  computeLinkGraph,
  computeBacklinkCandidates,
} from "@/lib/content-surface-engine/link-graph";

const corpus = loadManagedCorpus();

function withStatus(
  doc: ContentDocument,
  status: "draft" | "review" | "published",
  extra: Partial<{ indexingIntent: "index" | "noindex"; language: string }> = {},
): ContentDocument {
  return {
    ...doc,
    identity: {
      ...doc.identity,
      documentId: `${doc.identity.documentId}::${status}${extra.language ? "-" + extra.language : ""}${extra.indexingIntent === "noindex" ? "-noindex" : ""}`,
      language: extra.language ?? doc.identity.language,
    },
    truth: { ...doc.truth, publicationStatus: status },
    seo: { ...doc.seo, indexingIntent: extra.indexingIntent ?? doc.seo.indexingIntent },
  };
}

describe("A3R — LinkGraph determinism + public target filter", () => {
  it("determinism : same input twice ⇒ byte-equivalent graph", () => {
    const a = computeLinkGraph({ documents: corpus, topN: 3 });
    const b = computeLinkGraph({ documents: corpus, topN: 3 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("current 12 drafts with EMPTY indexable set ⇒ 0 public link targets", () => {
    const graph = computeLinkGraph({
      documents: corpus,
      topN: 3,
      indexableIds: new Set(),
    });
    let publicTargets = 0;
    for (const entry of graph) publicTargets += entry.related.length;
    expect(publicTargets).toBe(0);
  });

  it("only indexable documentIds may appear as PUBLIC link targets", () => {
    // Compose a mixed fixture : one PUBLISHED indexable, one draft, one
    // publication-failed (published but sourceAuthority uncertified — modeled
    // by NOT adding it to the indexable set), one wrong-language, one
    // fidelity-failed (again : not in the indexable set).
    const published = withStatus(corpus[0], "published", { indexingIntent: "index" });
    const draft = withStatus(corpus[1], "draft");
    const publicationFailed = withStatus(corpus[2], "published", { indexingIntent: "index" });
    const wrongLanguage = withStatus(corpus[3], "published", {
      indexingIntent: "index",
      language: "fr",
    });
    const fidelityFailed = withStatus(corpus[4], "published", { indexingIntent: "index" });

    const documents = [published, draft, publicationFailed, wrongLanguage, fidelityFailed];
    const indexableIds = new Set([published.identity.documentId]);

    const graph = computeLinkGraph({ documents, topN: 5, indexableIds });
    for (const entry of graph) {
      for (const rel of entry.related) {
        expect(indexableIds.has(rel.targetId)).toBe(true);
      }
    }
  });

  it("backlink candidates remain REPORT_ONLY (function returns array, never mutates)", () => {
    const before = JSON.stringify(corpus);
    const graph = computeLinkGraph({ documents: corpus, topN: 3 });
    const candidates = computeBacklinkCandidates(graph);
    expect(Array.isArray(candidates)).toBe(true);
    // Corpus not mutated.
    expect(JSON.stringify(corpus)).toBe(before);
  });

  it("no self-link in any related list", () => {
    const graph = computeLinkGraph({ documents: corpus, topN: 6 });
    for (const entry of graph) {
      for (const rel of entry.related) {
        expect(rel.targetId).not.toBe(entry.sourceId);
      }
    }
  });

  it("cross-language contamination : a wrong-language target may not appear against a target document", () => {
    const enDoc = withStatus(corpus[0], "published", { indexingIntent: "index", language: "en" });
    const frDoc = withStatus(corpus[1], "published", { indexingIntent: "index", language: "fr" });
    const graph = computeLinkGraph({
      documents: [enDoc, frDoc],
      topN: 3,
      indexableIds: new Set([enDoc.identity.documentId, frDoc.identity.documentId]),
    });
    const enEntry = graph.find((e) => e.sourceId === enDoc.identity.documentId);
    if (enEntry) {
      for (const r of enEntry.related) {
        expect(r.targetId).not.toBe(frDoc.identity.documentId);
      }
    }
  });
});
