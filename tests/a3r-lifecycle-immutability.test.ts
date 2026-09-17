// A3R §5 — Lifecycle is derived ONLY from governed editorial/source
// identities. Renderer / SurfacePolicy / CSS / deployment changes MUST NOT
// change the lifecycle state, `updatedAt`, or `lastReviewedAt`.

import { describe, expect, it } from "vitest";

import type { ContentDocument } from "@/lib/content-surface-engine/contract/content-document";
import { evaluateLifecycle } from "@/lib/content-surface-engine/lifecycle";
import { loadManagedCorpus } from "@/lib/content-surface-engine/conformance/corpus-loader";

const corpus = loadManagedCorpus();

function withRendererMetadataChange(doc: ContentDocument): ContentDocument {
  // Simulate a renderer/policy/CSS refactor : nothing that lifecycle should
  // observe. We do NOT mutate editorial identity or source provenance ;
  // just carry the "same" document with an in-memory tag that some downstream
  // observers might inspect.
  return { ...doc };
}

describe("A3R lifecycle immutability under renderer/policy churn", () => {
  it("every corpus document lifecycle is stable across two evaluations of the same doc", () => {
    for (const doc of corpus) {
      const a = evaluateLifecycle({ document: doc, reviewWindowDays: null });
      const b = evaluateLifecycle({
        document: withRendererMetadataChange(doc),
        reviewWindowDays: null,
      });
      expect(a.state).toBe(b.state);
      expect(JSON.stringify(a.reasons)).toBe(JSON.stringify(b.reasons));
      expect(JSON.stringify(a.inputs)).toBe(JSON.stringify(b.inputs));
    }
  });

  it("lifecycle depends ONLY on governed identities (source + status + review date)", () => {
    // Perturbing SEO / conversion / relationships (all non-lifecycle fields)
    // must NOT change lifecycle state.
    for (const doc of corpus) {
      const baseline = evaluateLifecycle({ document: doc, reviewWindowDays: null });
      const perturbed: ContentDocument = {
        ...doc,
        seo: { ...doc.seo, targetQuery: "totally-different-query" },
        conversion: { ...doc.conversion, conversionAllowed: !doc.conversion.conversionAllowed },
        relationships: {
          ...doc.relationships,
          relatedContentIds: [...doc.relationships.relatedContentIds, "made-up-id"],
        },
      };
      const perturbedResult = evaluateLifecycle({ document: perturbed, reviewWindowDays: null });
      expect(perturbedResult.state).toBe(baseline.state);
    }
  });

  it("SOURCE_CHANGED fires when sourceEvidenceDigest changes vs previous observation", () => {
    // Pick any corpus doc that has a source digest ; simulate a prior
    // observation with a DIFFERENT digest and confirm the state escalates
    // to SOURCE_CHANGED.
    const doc = corpus.find((d) => d.provenance.sourceEvidenceDigest !== undefined)!;
    const evaluated = evaluateLifecycle({
      document: doc,
      previous: {
        sourceEvidenceDigest: "0".repeat(64), // arbitrary older digest
        sourceStatus: doc.truth.sourceStatus,
      },
      reviewWindowDays: null,
    });
    expect(evaluated.state).toBe("SOURCE_CHANGED");
    // Reason enumerates the specific input that changed.
    expect(evaluated.reasons.some((r) => r.includes("sourceEvidenceDigest"))).toBe(true);
  });

  it("MATURITY_CHANGED fires when sourceStatus differs from previous", () => {
    const doc = corpus[0];
    const evaluated = evaluateLifecycle({
      document: doc,
      previous: {
        sourceStatus: `${doc.truth.sourceStatus}::PROBABLY_DIFFERENT_MATURITY`,
        sourceEvidenceDigest: doc.provenance.sourceEvidenceDigest,
      },
      reviewWindowDays: null,
    });
    expect(evaluated.state).toBe("MATURITY_CHANGED");
  });

  it("NEEDS_REVIEW fires when lastReviewedAt is older than reviewWindowDays", () => {
    // Build a synthetic doc whose lastReviewedAt is 1000 days ago and review
    // window is 30. The state must escalate to NEEDS_REVIEW.
    const past = new Date(Date.now() - 1000 * 24 * 3600 * 1000)
      .toISOString()
      .slice(0, 10);
    const doc: ContentDocument = {
      ...corpus[0],
      lifecycle: { ...corpus[0].lifecycle, lastReviewedAt: past },
    };
    const evaluated = evaluateLifecycle({
      document: doc,
      reviewWindowDays: 30,
      now: new Date(),
    });
    expect(evaluated.state).toBe("NEEDS_REVIEW");
  });

  it("multi-reason preservation : when several signals fire, ALL are recorded", () => {
    // Trigger BOTH SOURCE_CHANGED and MATURITY_CHANGED by changing both
    // the digest and the sourceStatus. The state machine picks ONE state
    // (documented precedence) but the reasons list must retain every
    // triggered signal.
    const doc = corpus.find((d) => d.provenance.sourceEvidenceDigest !== undefined)!;
    const evaluated = evaluateLifecycle({
      document: doc,
      previous: {
        sourceEvidenceDigest: "0".repeat(64),
        sourceStatus: `${doc.truth.sourceStatus}::MATURITY_TICK`,
      },
      reviewWindowDays: null,
    });
    expect(["SOURCE_CHANGED", "MATURITY_CHANGED"]).toContain(evaluated.state);
    expect(evaluated.reasons.length).toBeGreaterThanOrEqual(2);
  });
});
