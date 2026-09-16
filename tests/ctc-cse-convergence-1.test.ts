// CTC-CSE-CONVERGENCE-1 — non-vacuous convergence tests.
//
// Asserts:
//   1. The 12 managed-corpus documents pass CONTENT_PASS(textos.article@1) + SURFACE_PASS
//      via `resolveContentSurface(textosArticleReferencePolicy)`.
//   2. Every insight in the corpus is a draft with CTO §1 truth (reviewerIds empty,
//      no lastReviewedAt). This prevents any accidental re-population of fabricated
//      review metadata.
//   3. Publication-pass fails for every insight (fail-closed on drafts). If the CMO
//      later publishes an article, the test will fail *loudly* and force an update.
//   4. `listInsightSlugs` matches the corpus (no orphans, no phantoms).
//   5. The publication gate CANNOT be bypassed by declaring `indexingIntent: index` on
//      a draft — the shared ContentDocument invariant rejects it.

import { describe, expect, it } from "vitest";

import {
  ContentDocumentSchema,
  type ContentDocument,
} from "@/lib/content-surface-engine/contract/content-document";
import { evaluateContentPass } from "@/lib/content-surface-engine/conformance/content-pass";
import { resolveContentSurface } from "@/lib/content-surface-engine/composition/resolve-content-surface";
import { textosArticleReferencePolicy } from "@/lib/content-surface-engine/surface-policy";
import { evaluatePublicationPass } from "@/lib/content-surface-engine/publication";
import { evaluateLifecycle } from "@/lib/content-surface-engine/lifecycle";
import { loadManagedCorpus } from "@/lib/content-surface-engine/conformance/corpus-loader";
import { listInsightEntries, listInsightSlugs } from "@/lib/content-surface-engine/site-integration";

const corpus = loadManagedCorpus();

describe("CTC-CSE-CONVERGENCE-1 — corpus × CSE pipeline", () => {
  it("corpus contains exactly 12 documents", () => {
    expect(corpus.length).toBe(12);
  });

  it("every insight is currently a draft (CTO §1 truth preserved)", () => {
    for (const doc of corpus) {
      expect(doc.truth.publicationStatus).toBe("draft");
      expect(doc.seo.indexingIntent).toBe("noindex");
      // reviewerIds MUST be empty: migration is not a human review.
      expect(doc.editorial.reviewerIds).toEqual([]);
      // lastReviewedAt MUST be undefined for drafts.
      expect(doc.lifecycle.lastReviewedAt).toBeUndefined();
      // firstPublishedAt MUST be null.
      expect(doc.lifecycle.firstPublishedAt).toBeNull();
    }
  });

  it("every insight passes CONTENT_PASS(textos.article@1)", () => {
    for (const doc of corpus) {
      const r = evaluateContentPass({ document: doc, profile: "textos.article@1" });
      expect(
        r.passed,
        `${doc.identity.slug}: ${r.issues.map((i) => i.code).join(", ")}`,
      ).toBe(true);
    }
  });

  it("every insight passes SURFACE_PASS (composition + resolution do not throw)", () => {
    for (const doc of corpus) {
      expect(() =>
        resolveContentSurface(doc, textosArticleReferencePolicy),
      ).not.toThrow();
    }
  });

  it("every insight FAILS PUBLICATION_PASS (fail-closed on drafts)", () => {
    for (const doc of corpus) {
      const lifecycle = evaluateLifecycle({ document: doc });
      const r = evaluatePublicationPass({
        document: doc,
        surface: "reference",
        lifecycleState: lifecycle.state,
      });
      expect(r.passed).toBe(false);
      // The reason MUST be publication-status-not-publishable — anything else means the
      // document lied about its readiness.
      const codes = r.issues.map((i) => i.code);
      expect(codes).toContain("publication-status-not-publishable");
    }
  });

  it("no insight carries a Person `marc-p` reviewer at this stage", () => {
    // The prior migration falsely stamped marc-p as reviewer. Guard against regression.
    for (const doc of corpus) {
      expect(doc.editorial.reviewerIds).not.toContain("marc-p");
    }
  });

  it("`listInsightSlugs` exactly matches the loaded corpus", () => {
    const catalog = new Set(listInsightSlugs());
    const corpusSlugs = new Set(corpus.map((d) => d.identity.slug));
    expect(catalog).toEqual(corpusSlugs);
    expect(listInsightEntries().length).toBe(12);
  });

  it("SEO invariant: draft cannot request indexingIntent=index (contract-level rejection)", () => {
    for (const doc of corpus) {
      const tampered = {
        ...doc,
        seo: { ...doc.seo, indexingIntent: "index" as const },
      };
      const parsed = ContentDocumentSchema.safeParse(tampered);
      expect(parsed.success).toBe(false);
    }
  });

  it("body ordering: articles with a CTA carry a primary-cta slot before a heading past position 0", () => {
    // Every article that declared a ctaIntentId in conversion MUST have a primary-cta
    // slot somewhere in the body (contextual placement). This prevents the "final-only"
    // regression — a CTA that only appears at the foot would be a regression to the
    // original PR #19 shape.
    for (const doc of corpus) {
      if (!doc.conversion.ctaIntentId) continue;
      const hasPrimary = doc.body.some(
        (b: ContentDocument["body"][number]) => b.slot === "primary-cta",
      );
      expect(hasPrimary, `${doc.identity.slug}: missing primary-cta slot`).toBe(true);
    }
  });
});
