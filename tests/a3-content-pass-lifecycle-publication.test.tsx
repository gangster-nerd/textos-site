import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";

import { loadManagedCorpus } from "@/lib/content-surface-engine/conformance/corpus-loader";
import { ContentDocumentSchema } from "@/lib/content-surface-engine/contract/content-document";
import {
  evaluateContentPass,
  pickTextosContentPassProfile,
} from "@/lib/content-surface-engine/conformance/content-pass";
import { resolveContentSurface } from "@/lib/content-surface-engine/composition/resolve-content-surface";
import { textosArticleReferencePolicy } from "@/lib/content-surface-engine/surface-policy";
import { RenderReferenceBody } from "@/lib/content-surface-engine/renderer";
import { evaluateLifecycle } from "@/lib/content-surface-engine/lifecycle";
import { evaluatePublicationPass, decideIndexable } from "@/lib/content-surface-engine/publication";
import { computeLinkGraph, computeBacklinkCandidates } from "@/lib/content-surface-engine/link-graph";
import { compileAuthority } from "@/lib/content-surface-engine/authority";
import { issueReferencePublicationReceipt } from "@/lib/content-surface-engine/receipt";

const REPO = path.resolve(__dirname, "..");

function baseDoc() {
  return {
    contentSchemaVersion: "content-document@1",
    identity: {
      documentId: "generic:page:home",
      contentType: "page",
      slug: "home",
      language: "en",
      title: "Home",
      description: "Landing page.",
    },
    editorial: { authorIds: [], reviewerIds: [], topicIds: [] },
    truth: {
      statusVocabulary: "generic",
      statusVocabularyVersion: "1",
      sourceStatus: "N/A",
      publicationStatus: "published" as const,
      allowedSurfaces: ["reference" as const],
      claimIds: [],
      evidenceRefs: [],
      capabilityIds: [],
    },
    provenance: { sourceAuthority: "UNCERTIFIED" as const, sourceEvidenceDigest: "a".repeat(64) },
    body: [{ id: "p", kind: "paragraph" as const, data: { text: "Welcome." } }],
    relationships: { relatedContentIds: [] },
    conversion: { conversionAllowed: false },
    lifecycle: { publishedAt: "2026-09-13", updatedAt: "2026-09-13" },
    seo: { indexingIntent: "noindex" as const },
  };
}

describe("A3 — corpus + gates", () => {
  it("(#1) all 12 migrated documents validate as ContentDocument", () => {
    const corpus = loadManagedCorpus();
    expect(corpus.length).toBe(12);
    for (const doc of corpus) {
      // loadManagedCorpus already parsed with schema; re-parse to make the invariant explicit.
      const reparsed = ContentDocumentSchema.parse(JSON.parse(JSON.stringify(doc)));
      expect(reparsed.identity.contentType).toBe("product_article");
    }
  });

  it("(#2) migration preserves governed claims/evidence", () => {
    const corpus = loadManagedCorpus();
    // Spot-check three well-known insights from ARTICLE-SYSTEM-1.
    const noAffirmation = corpus.find((d) => d.identity.slug === "no-affirmation-without-evidence")!;
    expect(noAffirmation.truth.claimIds).toContain("m5-not-observable-is-not-zero");
    expect(noAffirmation.truth.capabilityIds).toContain("observe-authority-presence");
    const observatory = corpus.find((d) => d.identity.slug === "observatory-not-cms")!;
    expect(observatory).toBeDefined();
    expect(observatory.editorial.authorIds).toContain("textos-editorial-team");
    const briefEcon = corpus.find((d) => d.identity.slug === "brief-to-decision-economics")!;
    expect(briefEcon.truth.claimIds.length).toBeGreaterThan(0);
    expect(briefEcon.provenance.sourceEvidenceDigest).toMatch(/^[0-9a-f]{64}$/);
  });

  it("(#3) generic page survives CONTENT_PASS default profile", () => {
    const doc = ContentDocumentSchema.parse(baseDoc());
    const result = evaluateContentPass({ document: doc, profile: "default" });
    expect(result.passed).toBe(true);
    expect(result.checked).toContain("default.title-present");
    expect(result.checked).not.toContain("textos.article.short-answer");
  });

  it("(#4) generic entry survives CONTENT_PASS default profile", () => {
    const raw = baseDoc();
    raw.identity.contentType = "glossary_entry";
    raw.identity.title = "Authority Presence";
    raw.identity.description = "The rate at which answer engines cite a brand.";
    (raw.body as unknown[]) = [
      { id: "d", kind: "definition", data: { term: "Authority Presence", definition: "…" } },
    ];
    const doc = ContentDocumentSchema.parse(raw);
    const result = evaluateContentPass({ document: doc, profile: "default" });
    expect(result.passed).toBe(true);
  });

  it("(#5) contentType remains an open string", () => {
    for (const ct of ["article", "page", "entry", "llms_entry", "custom.family"]) {
      const raw = baseDoc();
      raw.identity.contentType = ct;
      expect(() => ContentDocumentSchema.parse(raw)).not.toThrow();
    }
  });

  it("(#6) article-quality rules are conditional, not universal", () => {
    // A generic `page` doc without answer/heading/author must NOT fail default profile,
    // and MUST fail textos.article@1 profile (which is what pickTextosContentPassProfile
    // would NOT select for it).
    const doc = ContentDocumentSchema.parse(baseDoc());
    expect(pickTextosContentPassProfile(doc)).toBe("default");
    expect(evaluateContentPass({ document: doc, profile: "default" }).passed).toBe(true);
    const failed = evaluateContentPass({ document: doc, profile: "textos.article@1" });
    expect(failed.passed).toBe(false);
    const codes = failed.issues.map((i) => i.code);
    expect(codes).toContain("textos.article.short-answer");
    expect(codes).toContain("textos.article.heading-present");
    expect(codes).toContain("textos.article.named-author");
  });

  it("(#7) LinkGraph is deterministic", () => {
    const corpus = loadManagedCorpus();
    const idxA = computeLinkGraph({ documents: corpus, topN: 3 });
    const idxB = computeLinkGraph({ documents: corpus, topN: 3 });
    expect(JSON.stringify(idxA)).toBe(JSON.stringify(idxB));
  });

  it("(#8) public links never target forbidden/draft content", () => {
    const corpus = loadManagedCorpus();
    // No document is indexable (all draft + uncertified). With an EMPTY indexableIds set the
    // LinkGraph must produce zero related entries.
    const graph = computeLinkGraph({ documents: corpus, indexableIds: new Set(), topN: 5 });
    for (const entry of graph) expect(entry.related.length).toBe(0);
  });

  it("(#9) backlink candidates are report-only (data only, no filesystem writes)", () => {
    const corpus = loadManagedCorpus();
    const graph = computeLinkGraph({ documents: corpus, topN: 5 }); // indexableIds unset
    const backlinks = computeBacklinkCandidates(graph);
    expect(Array.isArray(backlinks)).toBe(true);
    // Not persisted anywhere by the module itself; the file it would write, if it wrote, is
    // absent by construction — the module has no fs import.
    const src = readFileSync(
      path.join(REPO, "lib/content-surface-engine/link-graph/link-graph.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/from ['"]node:fs['"]/);
    expect(src).not.toMatch(/writeFile/);
  });

  it("(#10) lifecycle CURRENT with no previous observation", () => {
    const doc = loadManagedCorpus()[0];
    const state = evaluateLifecycle({ document: doc, reviewWindowDays: null });
    expect(state.state).toBe("CURRENT");
  });

  it("(#11) lifecycle SOURCE_CHANGED when digest differs", () => {
    const doc = loadManagedCorpus()[0];
    const state = evaluateLifecycle({
      document: doc,
      previous: { sourceEvidenceDigest: "0".repeat(64) },
      reviewWindowDays: null,
    });
    expect(state.state).toBe("SOURCE_CHANGED");
  });

  it("(#12) lifecycle MATURITY_CHANGED when sourceStatus differs", () => {
    const doc = loadManagedCorpus()[0];
    const state = evaluateLifecycle({
      document: doc,
      previous: { sourceStatus: "SOME_OTHER_MATURITY" },
      reviewWindowDays: null,
    });
    expect(state.state).toBe("MATURITY_CHANGED");
  });

  it("(#13) renderer/policy change alone does not mutate editorial updatedAt", () => {
    const doc = loadManagedCorpus()[0];
    // The lifecycle module does not touch documents; and evaluateLifecycle carries the same
    // updatedAt across arbitrary policy version identity changes.
    const before = doc.lifecycle.updatedAt;
    const state = evaluateLifecycle({
      document: doc,
      // Renderer/policy bumps should NEVER be counted as source changes:
      previous: {
        sourceEvidenceDigest: doc.provenance.sourceEvidenceDigest,
        sourceStatus: doc.truth.sourceStatus,
      },
      reviewWindowDays: null,
    });
    expect(state.state).toBe("CURRENT");
    expect(doc.lifecycle.updatedAt).toBe(before);
    // Sanity: the lifecycle module has no code path that mutates the document.
    const src = readFileSync(
      path.join(REPO, "lib/content-surface-engine/lifecycle/lifecycle.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/document\.lifecycle\s*=/);
    expect(src).not.toMatch(/document\.\w+\s*=\s*/);
  });

  it("(#14) PUBLICATION_PASS fails closed on draft + uncertified", () => {
    const doc = loadManagedCorpus()[0]; // draft + UNCERTIFIED
    const state = evaluateLifecycle({ document: doc, reviewWindowDays: null });
    const pass = evaluatePublicationPass({
      document: doc,
      surface: "reference",
      lifecycleState: state.state,
    });
    expect(pass.passed).toBe(false);
    const codes = pass.issues.map((i) => i.code);
    expect(codes).toContain("publication-status-not-publishable");
  });

  it("(#15) INDEXABLE requires all three passes", () => {
    const cp = { documentId: "d", profile: "default" as const, passed: true, issues: [], checked: [] };
    const surface = { passed: true, reasons: [] as readonly string[] };
    const pub = { documentId: "d", surface: "reference" as const, passed: true, issues: [] };
    expect(decideIndexable({ contentPass: cp, surfacePass: surface, publicationPass: pub }).indexable).toBe(true);
    expect(
      decideIndexable({
        contentPass: { ...cp, passed: false, issues: [{ code: "x", severity: "error", path: [], message: "m" }] },
        surfacePass: surface,
        publicationPass: pub,
      }).indexable,
    ).toBe(false);
    expect(
      decideIndexable({
        contentPass: cp,
        surfacePass: { passed: false, reasons: ["render error"] },
        publicationPass: pub,
      }).indexable,
    ).toBe(false);
    expect(
      decideIndexable({
        contentPass: cp,
        surfacePass: surface,
        publicationPass: { ...pub, passed: false, issues: [{ code: "publication-status-not-publishable", message: "m" }] },
      }).indexable,
    ).toBe(false);
  });

  it("(#16) draft/review is noindex through PUBLICATION_PASS", () => {
    const raw = baseDoc();
    (raw.truth as unknown as { publicationStatus: string }).publicationStatus = "review";
    const doc = ContentDocumentSchema.parse(raw);
    const pass = evaluatePublicationPass({
      document: doc,
      surface: "reference",
      lifecycleState: "CURRENT",
    });
    expect(pass.passed).toBe(false);
    expect(pass.issues[0].code).toBe("publication-status-not-publishable");
  });

  it("(#17) unknown source authority is noindex", () => {
    const raw = baseDoc();
    raw.provenance = {
      sourceAuthority: "UNCERTIFIED",
      sourceSha: "b".repeat(40),
    } as unknown as (typeof raw)["provenance"];
    // A declared uncertified SHA — publication-authority fails closed.
    const doc = ContentDocumentSchema.parse(raw);
    const pass = evaluatePublicationPass({
      document: doc,
      surface: "reference",
      lifecycleState: "CURRENT",
    });
    expect(pass.passed).toBe(false);
    expect(pass.issues.some((i) => i.code === "source-authority-uncertified")).toBe(true);
  });

  it("(#18) publication receipt never fabricates deployment facts", () => {
    // No env → NOT_ISSUED with all reasons enumerated.
    const receipt = issueReferencePublicationReceipt({
      contentDocumentId: "d",
      contentRevision: "1",
      contentSchemaVersion: "content-document@1",
      surfacePolicyVersion: "textos-site@1",
      renderVersion: "reference@1",
      sourceSha: null,
      sourceEvidenceDigest: "a".repeat(64),
      builtPath: "/reference-preview/foo",
      env: {},
    });
    expect(receipt.status).toBe("NOT_ISSUED");
    if (receipt.status === "NOT_ISSUED") {
      expect(receipt.reasons).toContain("no-merge-sha");
      expect(receipt.reasons).toContain("no-deployment-id");
      expect(receipt.reasons).toContain("no-canonical-origin");
      expect(receipt.reasons).toContain("not-indexable-build");
      expect(receipt.reasons).toContain("indexability-not-approved");
    }
    // Fully-formed env → ISSUED with declared facts.
    const issued = issueReferencePublicationReceipt({
      contentDocumentId: "d",
      contentRevision: "1",
      contentSchemaVersion: "content-document@1",
      surfacePolicyVersion: "textos-site@1",
      renderVersion: "reference@1",
      sourceSha: null,
      sourceEvidenceDigest: "a".repeat(64),
      builtPath: "/reference-preview/foo",
      env: {
        VERCEL_GIT_COMMIT_SHA: "c".repeat(40),
        VERCEL_DEPLOYMENT_ID: "dpl_123",
        SITE_ORIGIN: "https://textos.example",
        PUBLIC_ORIGIN_APPROVED: "true",
        PUBLIC_INDEXABLE_BUILD: "true",
      },
      now: () => new Date("2026-09-13T12:00:00Z"),
    });
    expect(issued.status).toBe("ISSUED");
    if (issued.status === "ISSUED") {
      expect(issued.canonicalUrl).toBe("https://textos.example/reference-preview/foo");
      expect(issued.publishedAt).toBe("2026-09-13T12:00:00.000Z");
    }
  });

  it("(#19) JSON-LD type selection does not blindly map generic entries to Article", () => {
    // A generic changelog / faq / developer_note / page must not receive an Article node.
    for (const ct of ["changelog_entry", "faq_entry", "developer_note", "page", "glossary_entry"]) {
      const raw = baseDoc();
      raw.identity.contentType = ct;
      const doc = ContentDocumentSchema.parse(raw);
      const resolved = resolveContentSurface(doc, textosArticleReferencePolicy);
      const compiled = compileAuthority({
        resolved,
        siteOrigin: "https://textos.example",
        siteName: "TextOS",
      });
      const hasArticle = compiled.jsonLd.some((n) => n["@type"] === "Article");
      expect(hasArticle, `${ct} should NOT get an Article JSON-LD node by default`).toBe(false);
    }
    // product_article still emits Article.
    const raw = baseDoc();
    raw.identity.contentType = "product_article";
    const doc = ContentDocumentSchema.parse(raw);
    const resolved = resolveContentSurface(doc, textosArticleReferencePolicy);
    const compiled = compileAuthority({
      resolved,
      siteOrigin: "https://textos.example",
      siteName: "TextOS",
    });
    expect(compiled.jsonLd.some((n) => n["@type"] === "Article")).toBe(true);
    // FAQPage / HowTo never emitted from the vocabulary.
    for (const node of compiled.jsonLd) {
      expect(node["@type"]).not.toBe("FAQPage");
      expect(node["@type"]).not.toBe("HowTo");
    }
  });

  it("(#20) no Native seam touched (A3 new modules)", () => {
    const files = [
      "lib/content-surface-engine/conformance/corpus-loader.ts",
      "lib/content-surface-engine/conformance/content-pass.ts",
      "lib/content-surface-engine/link-graph/link-graph.ts",
      "lib/content-surface-engine/lifecycle/lifecycle.ts",
      "lib/content-surface-engine/publication/publication-pass.ts",
      "lib/content-surface-engine/publication/indexable.ts",
      "lib/content-surface-engine/receipt/receipt.ts",
    ];
    const forbidden = [
      "NativeCompositionPlan",
      "NativeAdapter",
      "AssetSpec",
      "publishArticleAction",
      "textos-v0",
      "gutenberg",
      "elementor",
    ];
    for (const rel of files) {
      const src = readFileSync(path.join(REPO, rel), "utf8");
      for (const needle of forbidden) {
        expect(src.toLowerCase().includes(needle.toLowerCase())).toBe(false);
      }
    }
  });

  it("(bonus) corpus full pipeline: 0 indexable, 12 noindex, all reasons enumerated", () => {
    const corpus = loadManagedCorpus();
    let indexable = 0;
    for (const doc of corpus) {
      const profile = pickTextosContentPassProfile(doc);
      const cp = evaluateContentPass({ document: doc, profile });
      let surfacePassed = true;
      const surfaceReasons: string[] = [];
      try {
        const resolved = resolveContentSurface(doc, textosArticleReferencePolicy);
        renderToStaticMarkup(React.createElement(RenderReferenceBody, { resolved }));
      } catch (err) {
        surfacePassed = false;
        surfaceReasons.push((err as Error).message);
      }
      const life = evaluateLifecycle({ document: doc, reviewWindowDays: null });
      const pub = evaluatePublicationPass({
        document: doc,
        surface: "reference",
        lifecycleState: life.state,
      });
      const decision = decideIndexable({
        contentPass: cp,
        surfacePass: { passed: surfacePassed, reasons: surfaceReasons },
        publicationPass: pub,
      });
      if (decision.indexable) indexable += 1;
      if (!decision.indexable) expect(decision.reasons.length).toBeGreaterThan(0);
    }
    expect(indexable).toBe(0);
  });

  it("(bonus) ShortsOS forward-compatibility regression", () => {
    // contentType stays open; a hypothetical shortsos_short validates and does NOT
    // automatically get an Article node.
    const raw = baseDoc();
    raw.identity.contentType = "shortsos_short";
    const doc = ContentDocumentSchema.parse(raw);
    const resolved = resolveContentSurface(doc, textosArticleReferencePolicy);
    const compiled = compileAuthority({
      resolved,
      siteOrigin: "https://shortsos.example",
      siteName: "ShortsOS",
    });
    expect(compiled.jsonLd.some((n) => n["@type"] === "Article")).toBe(false);
    // CSE does not know claimCeiling / prohibitedClaims — the contract file must not
    // reference them.
    const contract = readFileSync(
      path.join(REPO, "lib/content-surface-engine/contract/content-document.ts"),
      "utf8",
    );
    expect(contract).not.toMatch(/claimCeiling|prohibitedClaims/);
  });
});
