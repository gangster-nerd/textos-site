// A3R §§9–11 — publication-receipt regression corpus.
//
//   §9  every receipt (ISSUED or NOT_ISSUED) carries the sealed content
//       contract fingerprint.
//   §10 ISSUED requires an IndexableDecision for the specific document.
//   §11 governance identity carried on ISSUED.
//
// Corresponding scenarios A–E from the mission spec.

import { describe, expect, it } from "vitest";

import { issueReferencePublicationReceipt } from "@/lib/content-surface-engine/receipt";

const A3R_FINGERPRINT =
  "4cefe8c6ed8917180870a37a3f3dbf5d2ff3d9395563dc683fc189b4e47b7e7b";

const FULL_ENV = {
  VERCEL_GIT_COMMIT_SHA: "c".repeat(40),
  VERCEL_DEPLOYMENT_ID: "dpl_a3r_1",
  SITE_ORIGIN: "https://textos.example",
  PUBLIC_ORIGIN_APPROVED: "true",
  PUBLIC_INDEXABLE_BUILD: "true",
} as const;

function base(overrides: Partial<Parameters<typeof issueReferencePublicationReceipt>[0]> = {}) {
  return {
    contentDocumentId: "textos-insight:doc-1",
    contentRevision: "1",
    contentSchemaVersion: "content-document@1",
    contentContractFingerprint: A3R_FINGERPRINT,
    surfacePolicyVersion: "textos-site@1",
    renderVersion: "reference@1",
    sourceSha: null,
    sourceEvidenceDigest: "a".repeat(64),
    builtPath: "/insights/doc-1",
    env: { ...FULL_ENV },
    now: () => new Date("2026-09-17T12:00:00Z"),
    ...overrides,
  };
}

describe("A3R — publication receipt fingerprint + indexability binding", () => {
  it("A. all env present + indexable=false → NOT_ISSUED with indexability-gate-failed", () => {
    const r = issueReferencePublicationReceipt(
      base({
        indexableDecision: { documentId: "textos-insight:doc-1", indexable: false },
      }),
    );
    expect(r.status).toBe("NOT_ISSUED");
    if (r.status === "NOT_ISSUED") {
      expect(r.reasons).toContain("indexability-gate-failed");
      expect(r.contentContractFingerprint).toBe(A3R_FINGERPRINT);
    }
  });

  it("B. all env present + indexable=true → ISSUED with governance identity", () => {
    const r = issueReferencePublicationReceipt(
      base({
        indexableDecision: { documentId: "textos-insight:doc-1", indexable: true },
      }),
    );
    expect(r.status).toBe("ISSUED");
    if (r.status === "ISSUED") {
      expect(r.contentContractFingerprint).toBe(A3R_FINGERPRINT);
      expect(r.contentDocumentId).toBe("textos-insight:doc-1");
      expect(r.contentRevision).toBe("1");
      expect(r.contentSchemaVersion).toBe("content-document@1");
      expect(r.surfacePolicyVersion).toBe("textos-site@1");
      expect(r.renderVersion).toBe("reference@1");
      expect(r.deploymentId).toBe("dpl_a3r_1");
      expect(r.mergeSha).toBe("c".repeat(40));
      expect(r.canonicalUrl).toBe("https://textos.example/insights/doc-1");
      expect(r.publishedAt).toBe("2026-09-17T12:00:00.000Z");
    }
  });

  it("C. indexable decision from WRONG document → NOT_ISSUED with mismatch reason", () => {
    const r = issueReferencePublicationReceipt(
      base({
        indexableDecision: { documentId: "textos-insight:OTHER", indexable: true },
      }),
    );
    expect(r.status).toBe("NOT_ISSUED");
    if (r.status === "NOT_ISSUED") {
      expect(r.reasons).toContain("indexability-decision-document-mismatch");
    }
  });

  it("D. no env + indexable=true → NOT_ISSUED with env reasons and fingerprint carried", () => {
    const r = issueReferencePublicationReceipt(
      base({
        env: {},
        indexableDecision: { documentId: "textos-insight:doc-1", indexable: true },
      }),
    );
    expect(r.status).toBe("NOT_ISSUED");
    if (r.status === "NOT_ISSUED") {
      expect(r.reasons).toContain("no-merge-sha");
      expect(r.reasons).toContain("no-deployment-id");
      expect(r.reasons).toContain("no-canonical-origin");
      expect(r.reasons).toContain("not-indexable-build");
      expect(r.reasons).toContain("indexability-not-approved");
      expect(r.contentContractFingerprint).toBe(A3R_FINGERPRINT);
    }
  });

  it("E. no indexable decision at all → NOT_ISSUED with indexability-decision-missing", () => {
    const r = issueReferencePublicationReceipt(base({}));
    expect(r.status).toBe("NOT_ISSUED");
    if (r.status === "NOT_ISSUED") {
      expect(r.reasons).toContain("indexability-decision-missing");
    }
  });

  it("fingerprint change alters the receipt shape but not its outcome family", () => {
    const OTHER = "0".repeat(64);
    const a = issueReferencePublicationReceipt(
      base({ indexableDecision: { documentId: "textos-insight:doc-1", indexable: true } }),
    );
    const b = issueReferencePublicationReceipt(
      base({
        contentContractFingerprint: OTHER,
        indexableDecision: { documentId: "textos-insight:doc-1", indexable: true },
      }),
    );
    // Both ISSUED ; fingerprint carried verbatim.
    expect(a.status).toBe("ISSUED");
    expect(b.status).toBe("ISSUED");
    expect(a.contentContractFingerprint).toBe(A3R_FINGERPRINT);
    expect(b.contentContractFingerprint).toBe(OTHER);
  });
});
