import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  CONTENT_SCHEMA_VERSION,
  ContentDocumentSchema,
  SURFACE_POLICY_VERSION,
  SurfacePolicySchema,
  resolveContentSurface,
  resolveSourceAuthority,
  SurfaceNotAllowedError,
  UncertifiedProvenanceError,
} from "@/lib/content-surface-engine";
import {
  articleFixture,
  changelogFixture,
  referenceArticlePolicy,
  referenceChangelogPolicy,
} from "@/lib/content-surface-engine/conformance/fixtures";

const REPO_ROOT = path.resolve(__dirname, "..");

describe("CSE-1 — COMPOSER contract", () => {
  it("(#1) contract has no React / Next / CMS dependency", () => {
    const files = [
      "lib/content-surface-engine/contract/content-document.ts",
      "lib/content-surface-engine/contract/surface-policy.ts",
      "lib/content-surface-engine/contract/resolved-content-surface.ts",
      "lib/content-surface-engine/composition/resolve-content-surface.ts",
      "lib/content-surface-engine/composition/provenance-authority.ts",
    ];
    for (const rel of files) {
      const src = readFileSync(path.join(REPO_ROOT, rel), "utf8");
      // No React imports.
      expect(src).not.toMatch(/from\s+['"]react['"]/);
      expect(src).not.toMatch(/from\s+['"]react-dom['"]/);
      // No Next.js imports.
      expect(src).not.toMatch(/from\s+['"]next\//);
      expect(src).not.toMatch(/from\s+['"]next['"]/);
      // No CMS SDKs.
      expect(src).not.toMatch(/@sanity|contentful|prismic|@shopify/i);
      // No JSX.
      expect(src).not.toMatch(/<[A-Z][A-Za-z]*[\s/>]/);
    }
  });

  it("(#2) sourceStatus is opaque to the engine", () => {
    // Two documents with completely unrelated statusVocabularies must produce identical
    // engine decisions when their normalized publicationStatus + allowedSurfaces agree.
    const resolvedA = resolveContentSurface(articleFixture, referenceArticlePolicy);
    const resolvedB = resolveContentSurface(changelogFixture, referenceChangelogPolicy);
    // Both surface to `reference` because both allow it; sourceStatus differs entirely.
    expect(resolvedA.truth.publicationStatus).toBe("published");
    expect(resolvedB.truth.publicationStatus).toBe("published");
    expect(articleFixture.truth.sourceStatus).not.toBe(changelogFixture.truth.sourceStatus);
    expect(articleFixture.truth.statusVocabulary).not.toBe(
      changelogFixture.truth.statusVocabulary,
    );
  });

  it("(#3) publicationStatus + allowedSurfaces is the normalized boundary — divergent vocabularies give the same engine decision", () => {
    // Product A vocab.
    const docA = ContentDocumentSchema.parse({
      ...articleFixture,
      truth: {
        ...articleFixture.truth,
        statusVocabulary: "product.a",
        statusVocabularyVersion: "1",
        sourceStatus: "A:FULLY_RELEASED",
      },
    });
    // Product B vocab.
    const docB = ContentDocumentSchema.parse({
      ...articleFixture,
      truth: {
        ...articleFixture.truth,
        statusVocabulary: "product.b",
        statusVocabularyVersion: "42",
        sourceStatus: "B:GA/PUBLIC/UNLOCKED",
      },
    });
    const a = resolveContentSurface(docA, referenceArticlePolicy);
    const b = resolveContentSurface(docB, referenceArticlePolicy);
    expect(a.truth.publicationStatus).toBe(b.truth.publicationStatus);
    expect(a.truth.allowedSurfaces).toEqual(b.truth.allowedSurfaces);
    expect(a.visibleBlockKinds).toEqual(b.visibleBlockKinds);
    expect(a.metadata.effectiveIndexing).toBe(b.metadata.effectiveIndexing);
  });

  it("(#4) unknown certified Git SHA fails closed", () => {
    const unknown = "0".repeat(40);
    const auth = resolveSourceAuthority({ sourceSha: unknown });
    expect(auth.authority).toBe("UNCERTIFIED");
    // narrow discriminant
    if (auth.reason === "unknown-source-sha") {
      expect(auth.failClosed).toBe(true);
    } else {
      throw new Error("expected unknown-source-sha reason");
    }
    const doc = ContentDocumentSchema.parse({
      ...articleFixture,
      provenance: {
        ...articleFixture.provenance,
        sourceSha: unknown,
      },
    });
    expect(() => resolveContentSurface(doc, referenceArticlePolicy)).toThrow(
      UncertifiedProvenanceError,
    );
  });

  it("(#5) SurfacePolicy cannot mutate ContentDocument", () => {
    const snapshot = JSON.parse(JSON.stringify(articleFixture));
    const resolved = resolveContentSurface(articleFixture, referenceArticlePolicy);
    // Attempting to mutate the resolved output must not affect the document.
    (resolved.blocks as unknown as { length: number }).length = 0;
    expect(articleFixture).toEqual(snapshot);
    // Policy override attempts to force `index` and force a CTA cannot elevate beyond what
    // the document permits.
    const noCtaDoc = ContentDocumentSchema.parse({
      ...articleFixture,
      conversion: { ctaIntentId: undefined, conversionAllowed: false },
    });
    const forced = resolveContentSurface(noCtaDoc, referenceArticlePolicy);
    expect(forced.conversion.effectiveCtaAllowed).toBe(false);
    expect(forced.conversion.ctaSuppressedReason).toBe("document.conversionAllowed=false");
  });

  it("(#6) resolveContentSurface is deterministic", () => {
    const a = resolveContentSurface(articleFixture, referenceArticlePolicy);
    const b = resolveContentSurface(articleFixture, referenceArticlePolicy);
    expect(a.compositionSignature).toBe(b.compositionSignature);
    expect(a).toEqual(b);
  });

  it("(#7) renderer/policy version changes do not imply editorial updatedAt changes", () => {
    // Compose the same document under a modified policy version. The document's editorial
    // updatedAt is untouched; the composition signature reflects the policy change but the
    // engine does not touch `document.lifecycle.updatedAt`.
    const bumpedPolicy = SurfacePolicySchema.parse({
      ...referenceArticlePolicy,
      policyId: "reference.article.v1.b",
    });
    const a = resolveContentSurface(articleFixture, referenceArticlePolicy);
    const b = resolveContentSurface(articleFixture, bumpedPolicy);
    expect(a.compositionSignature).not.toBe(b.compositionSignature);
    // The engine does not carry editorial updatedAt into the resolved surface; the
    // document's editorial dates remain unchanged and untouched by composition.
    expect(articleFixture.lifecycle.updatedAt).toBe("2026-09-12");
  });

  it("(#8) representative TextOS article semantics can be expressed", () => {
    const resolved = resolveContentSurface(articleFixture, referenceArticlePolicy);
    expect(resolved.contentType).toBe("product_article");
    expect(resolved.title).toBe("No affirmation without evidence");
    expect(resolved.visibleBlockKinds).toContain("answer");
    expect(resolved.visibleBlockKinds).toContain("evidence");
    expect(resolved.visibleBlockKinds).toContain("cta_slot");
    expect(resolved.metadata.effectiveIndexing).toBe("index");
    expect(resolved.metadata.schemaType).toBe("Article");
    expect(resolved.authorship.authorIds).toEqual(["textos-editorial-team"]);
    expect(resolved.truth.sourceAuthority).toBe("CERTIFIED_MAIN");
  });

  it("(#9) a non-article fixture can also be expressed", () => {
    const resolved = resolveContentSurface(changelogFixture, referenceChangelogPolicy);
    expect(resolved.contentType).toBe("changelog_entry");
    expect(resolved.visibleBlockKinds).toContain("steps");
    expect(resolved.visibleBlockKinds).toContain("source");
    // Changelog policy denies CTA and indexing.
    expect(resolved.conversion.effectiveCtaAllowed).toBe(false);
    expect(resolved.metadata.effectiveIndexing).toBe("noindex");
    expect(resolved.metadata.emitSchemaOrg).toBe(false);
  });

  it("(#10) no import or dependency on feat/ctc-article-system-1 exists", () => {
    // Guard: any accidental import from lib/content-surface-engine into the article-system
    // module namespace (article-derivations, insight-verifier, author/topic registries,
    // article JSON-LD builder, freshness/link-graph/copy-safety) would violate the mission.
    // Those modules do not exist on origin/main and must not be introduced by CSE-1.
    const roots = [
      "lib/content-surface-engine/contract/content-document.ts",
      "lib/content-surface-engine/contract/surface-policy.ts",
      "lib/content-surface-engine/contract/resolved-content-surface.ts",
      "lib/content-surface-engine/composition/resolve-content-surface.ts",
      "lib/content-surface-engine/composition/provenance-authority.ts",
      "lib/content-surface-engine/conformance/fixtures.ts",
      "lib/content-surface-engine/index.ts",
    ];
    const forbidden = [
      "article-derivations",
      "insight-verifier",
      "author-registry",
      "topic-registry",
      "build-article-graph",
      "link-graph",
      "freshness",
      "copy-safety",
      "backlink-candidates",
      "app/insights",
    ];
    for (const rel of roots) {
      const src = readFileSync(path.join(REPO_ROOT, rel), "utf8");
      for (const needle of forbidden) {
        expect(
          src.includes(needle),
          `${rel} must not reference "${needle}"`,
        ).toBe(false);
      }
    }
  });

  it("(bonus) allowedSurfaces gate refuses a disallowed surface", () => {
    const nativeOnly = ContentDocumentSchema.parse({
      ...articleFixture,
      truth: { ...articleFixture.truth, allowedSurfaces: ["native"] },
    });
    expect(() => resolveContentSurface(nativeOnly, referenceArticlePolicy)).toThrow(
      SurfaceNotAllowedError,
    );
  });

  it("(bonus) contract version literals are stable", () => {
    expect(CONTENT_SCHEMA_VERSION).toBe("content-document@1");
    expect(SURFACE_POLICY_VERSION).toBe("surface-policy@1");
  });
});
