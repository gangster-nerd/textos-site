// A3R-GOVERNANCE-PUBLICATION §4 — PUBLICATION_PASS non-vacuous fixtures A–J.
//
// Each scenario constructs a MINIMAL ContentDocument, invokes
// `evaluatePublicationPass`, and asserts the required PASS/FAIL verdict with
// the specific machine-readable reason code (fail-closed principles).

import { describe, expect, it } from "vitest";

import type { ContentDocument } from "@/lib/content-surface-engine/contract/content-document";
import { evaluatePublicationPass } from "@/lib/content-surface-engine/publication/publication-pass";

const CERTIFIED_SHA = "a0efa146a8691938b624c156d99f4663f6f92218"; // T0-certified in content/certified-lineage.json.

interface Overrides {
  publicationStatus?: string;
  allowedSurfaces?: string[];
  sourceAuthority?: "CERTIFIED_MAIN" | "CERTIFIED_CANDIDATE" | "UNCERTIFIED";
  sourceSha?: string;
  sourceEvidenceDigest?: string;
  sourceRepository?: string;
  indexingIntent?: "index" | "noindex";
  humanReviewRequired?: boolean;
}

function mkDoc(overrides: Overrides = {}): ContentDocument {
  return {
    contentSchemaVersion: "content-document@1",
    identity: {
      documentId: "fixture:pub-a3r",
      contentType: "product_article",
      slug: "pub-a3r",
      language: "en",
      title: "T",
      description: "D",
    },
    editorial: {
      authorIds: ["marc-prempain"],
      reviewerIds: ["marc-prempain"],
      topicIds: [],
    },
    truth: {
      statusVocabulary: "a3r",
      statusVocabularyVersion: "v1",
      sourceStatus: "PRODUCT_PRINCIPLE:DOCUMENTARY:AUTHORITATIVE_MAIN",
      publicationStatus:
        (overrides.publicationStatus as "draft" | "published") ?? "published",
      allowedSurfaces: (overrides.allowedSurfaces as ["reference"]) ?? ["reference"],
      claimIds: [],
      evidenceRefs: [],
      capabilityIds: [],
    },
    provenance: {
      sourceRepository: overrides.sourceRepository ?? "gangster-nerd/textos-v0",
      sourceSha: overrides.sourceSha,
      sourceEvidenceDigest: overrides.sourceEvidenceDigest,
      sourceAuthority: overrides.sourceAuthority ?? "UNCERTIFIED",
    },
    body: [],
    relationships: { relatedContentIds: [] },
    conversion: { conversionAllowed: false },
    lifecycle: {},
    seo: {
      indexingIntent: overrides.indexingIntent ?? "index",
    },
  } as unknown as ContentDocument;
}

describe("A3R — PUBLICATION_PASS fail-closed fixtures A–J", () => {
  it("A. draft otherwise valid → FAIL publication-status-not-publishable", () => {
    const r = evaluatePublicationPass({
      document: mkDoc({ publicationStatus: "draft", sourceSha: CERTIFIED_SHA, sourceAuthority: "CERTIFIED_MAIN" }),
      surface: "reference",
      lifecycleState: "CURRENT",
    });
    expect(r.passed).toBe(false);
    expect(r.issues.map((i) => i.code)).toContain("publication-status-not-publishable");
  });

  it("B. published + unknown sourceSha → FAIL source-authority-uncertified", () => {
    const r = evaluatePublicationPass({
      document: mkDoc({ sourceSha: "f".repeat(40), sourceAuthority: "CERTIFIED_MAIN" }),
      surface: "reference",
      lifecycleState: "CURRENT",
    });
    expect(r.passed).toBe(false);
    // The gate reports either source-authority-uncertified or source-authority-mismatch
    // for an unknown SHA claiming CERTIFIED_MAIN. Both are the honest reason.
    const codes = r.issues.map((i) => i.code);
    expect(
      codes.some((c) => c === "source-authority-uncertified" || c === "source-authority-mismatch"),
      `expected an unknown-SHA reason ; got ${codes.join(", ")}`,
    ).toBe(true);
  });

  it("C. published + forged declared CERTIFIED_MAIN + unknown SHA → FAIL", () => {
    const r = evaluatePublicationPass({
      document: mkDoc({
        sourceSha: "1".repeat(40),
        sourceAuthority: "CERTIFIED_MAIN",
      }),
      surface: "reference",
      lifecycleState: "CURRENT",
    });
    expect(r.passed).toBe(false);
    const codes = r.issues.map((i) => i.code);
    expect(
      codes.some((c) => c === "source-authority-uncertified" || c === "source-authority-mismatch"),
    ).toBe(true);
  });

  it("D. published + T0 CERTIFIED_MAIN SHA + matching authority → provenance PASS (surface allowed)", () => {
    const r = evaluatePublicationPass({
      document: mkDoc({
        sourceSha: CERTIFIED_SHA,
        sourceAuthority: "CERTIFIED_MAIN",
      }),
      surface: "reference",
      lifecycleState: "CURRENT",
    });
    // Full PASS requires ALL sub-gates green ; the T0 SHA is a certified
    // ancestor, so provenance no longer fails. Publication may still fail on
    // other axes (human review, seo intent) — assert the provenance issue is
    // ABSENT from the report.
    const codes = r.issues.map((i) => i.code);
    expect(codes).not.toContain("source-authority-uncertified");
    expect(codes).not.toContain("source-authority-mismatch");
  });

  it("E. non-Git evidence + no explicit authorization → FAIL non-git-provenance-not-authorized", () => {
    const r = evaluatePublicationPass({
      document: mkDoc({ sourceEvidenceDigest: "a".repeat(64) }),
      surface: "reference",
      lifecycleState: "CURRENT",
      // authorizeNonGitProvenance intentionally OMITTED.
    });
    expect(r.passed).toBe(false);
    const codes = r.issues.map((i) => i.code);
    expect(
      codes.includes("non-git-provenance-not-authorized") ||
        codes.includes("source-authority-uncertified"),
    ).toBe(true);
  });

  it("F. non-Git evidence + explicit governed authorization → provenance sub-gate PASS", () => {
    const r = evaluatePublicationPass({
      document: mkDoc({ sourceEvidenceDigest: "a".repeat(64) }),
      surface: "reference",
      lifecycleState: "CURRENT",
      authorizeNonGitProvenance: true,
    });
    const codes = r.issues.map((i) => i.code);
    expect(codes).not.toContain("non-git-provenance-not-authorized");
  });

  it("G. SOURCE_CHANGED → FAIL lifecycle-blocks-publication", () => {
    const r = evaluatePublicationPass({
      document: mkDoc({ sourceSha: CERTIFIED_SHA, sourceAuthority: "CERTIFIED_MAIN" }),
      surface: "reference",
      lifecycleState: "SOURCE_CHANGED",
    });
    expect(r.passed).toBe(false);
    expect(r.issues.map((i) => i.code)).toContain("lifecycle-blocks-publication");
  });

  it("H. MATURITY_CHANGED → FAIL lifecycle-blocks-publication", () => {
    const r = evaluatePublicationPass({
      document: mkDoc({ sourceSha: CERTIFIED_SHA, sourceAuthority: "CERTIFIED_MAIN" }),
      surface: "reference",
      lifecycleState: "MATURITY_CHANGED",
    });
    expect(r.passed).toBe(false);
    expect(r.issues.map((i) => i.code)).toContain("lifecycle-blocks-publication");
  });

  it("I. NEEDS_REVIEW → FAIL lifecycle-blocks-publication", () => {
    const r = evaluatePublicationPass({
      document: mkDoc({ sourceSha: CERTIFIED_SHA, sourceAuthority: "CERTIFIED_MAIN" }),
      surface: "reference",
      lifecycleState: "NEEDS_REVIEW",
    });
    expect(r.passed).toBe(false);
    expect(r.issues.map((i) => i.code)).toContain("lifecycle-blocks-publication");
  });

  it("J. CURRENT + all satisfied publication conditions → PASS", () => {
    const r = evaluatePublicationPass({
      document: mkDoc({
        sourceSha: CERTIFIED_SHA,
        sourceAuthority: "CERTIFIED_MAIN",
      }),
      surface: "reference",
      lifecycleState: "CURRENT",
    });
    expect(
      r.passed,
      `expected PASS ; got ${r.issues.map((i) => i.code).join(", ")}`,
    ).toBe(true);
  });

  it("cross-cut : surface not allowed → FAIL surface-not-allowed", () => {
    const r = evaluatePublicationPass({
      document: mkDoc({
        sourceSha: CERTIFIED_SHA,
        sourceAuthority: "CERTIFIED_MAIN",
        allowedSurfaces: ["native"],
      }),
      surface: "reference",
      lifecycleState: "CURRENT",
    });
    expect(r.passed).toBe(false);
    expect(r.issues.map((i) => i.code)).toContain("surface-not-allowed");
  });
});
