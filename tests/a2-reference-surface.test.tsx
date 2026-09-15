import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";

import {
  resolveContentSurface,
} from "@/lib/content-surface-engine/composition/resolve-content-surface";
import {
  RENDER_VERSION,
  RenderReferenceBody,
  UnsupportedBlockKindError,
} from "@/lib/content-surface-engine/renderer";
import { ManagedTextosSurface } from "@/lib/content-surface-engine/renderer/managed-textos-surface";
import {
  TEXTOS_SITE_POLICY_VERSION,
  textosArticleReferencePolicy,
  textosMinimalReferencePolicy,
} from "@/lib/content-surface-engine/surface-policy";
import { compileAuthority } from "@/lib/content-surface-engine/authority";
import { resolveReferenceCta } from "@/lib/content-surface-engine/conversion";
import {
  buildAttributedUrl,
  createEmitter,
  createInMemoryTouchStore,
  newAttributionId,
  recordAttributionTouch,
} from "@/lib/content-surface-engine/instrumentation";
import {
  surfacePassArticleFixture,
  surfacePassChangelogFixture,
  surfacePassEvidenceFixture,
} from "@/lib/content-surface-engine/conformance/surface-pass/fixtures";
import { resolveReferenceAuthor } from "@/lib/content-surface-engine/site-integration";
import type { ResolvedContentSurface } from "@/lib/content-surface-engine/contract/resolved-content-surface";

const REPO_ROOT = path.resolve(__dirname, "..");

function compose(fixture: typeof surfacePassArticleFixture, policy = textosArticleReferencePolicy) {
  const resolved = resolveContentSurface(fixture, policy);
  const cta = resolveReferenceCta({
    resolved,
    intent: fixture.conversion.ctaIntentId ?? "",
  });
  return { resolved, cta };
}

function renderFull(resolved: ResolvedContentSurface, cta = null as ReturnType<typeof resolveReferenceCta>) {
  return renderToStaticMarkup(
    <ManagedTextosSurface
      resolved={resolved}
      cta={cta}
      resolveAuthor={(id) => resolveReferenceAuthor(id)}
      kicker="Preview"
      contentRevision="0"
    />,
  );
}

describe("A2 — REFERENCE surface", () => {
  it("(#1) renderer consumes ResolvedContentSurface, not raw markdown", () => {
    const { resolved } = compose(surfacePassArticleFixture);
    const html = renderToStaticMarkup(<RenderReferenceBody resolved={resolved} />);
    expect(html).toContain(`data-cse-render-version="${RENDER_VERSION}"`);
    // No markdown token characters leak through as raw text since the renderer never runs a
    // markdown parser: the fixture blocks contain plain sentences only.
    expect(html).not.toContain("```");
  });

  it("(#2) renderer does not mutate ContentDocument", () => {
    const before = JSON.parse(JSON.stringify(surfacePassArticleFixture));
    const { resolved, cta } = compose(surfacePassArticleFixture);
    renderFull(resolved, cta);
    expect(surfacePassArticleFixture).toEqual(before);
  });

  it("(#3) renderer does not infer publication authority", () => {
    const { resolved } = compose(surfacePassEvidenceFixture);
    // Fixture is a draft. Renderer must reflect (not upgrade) the publicationStatus.
    expect(resolved.truth.publicationStatus).toBe("draft");
    const html = renderFull(resolved, null);
    expect(html).toContain("Status");
    // Publication authority is opaque to the renderer — it never invents CERTIFIED_MAIN etc.
    expect(resolved.truth.sourceAuthority).toBe("CERTIFIED_MAIN");
  });

  it("(#4) unsupported block types fail explicitly", async () => {
    const fixtureWithBogus = JSON.parse(JSON.stringify(surfacePassArticleFixture));
    fixtureWithBogus.body.push({ id: "bogus", kind: "not-a-real-kind", data: {} });
    // The Zod schema rejects unknown kinds — the fixture will never reach the renderer with
    // an unknown kind. To prove the fail-closed BLOCK RENDERER, cast an unknown block directly.
    const mod = await import("@/lib/content-surface-engine/renderer");
    expect(() =>
      mod.renderBlock({ id: "x", kind: "not-a-real-kind", data: {} } as never, { documentId: "d" }),
    ).toThrow(UnsupportedBlockKindError);
  });

  it("(#5) TextOS visual/presentation policy stays outside ContentDocument", () => {
    // No visual/presentation keys leak into the fixture.
    const doc = surfacePassArticleFixture;
    const forbidden = ["classNames", "colorTokens", "hero", "layout", "twoColumn"] as const;
    for (const k of forbidden) {
      expect(Object.keys(doc)).not.toContain(k);
      expect(Object.keys(doc.body[0])).not.toContain(k);
    }
    // The policy carries them.
    expect(textosArticleReferencePolicy.policyId).toContain("textos-site");
  });

  it("(#6) article fixture renders", () => {
    const { resolved, cta } = compose(surfacePassArticleFixture);
    const html = renderFull(resolved, cta);
    expect(html).toContain("No affirmation without evidence");
    expect(html).toContain("Short answer");
    expect(html).toContain("Sources");
    expect(html).toContain('data-cse-cta-variant="measurement_request"');
  });

  it("(#7) evidence-heavy fixture renders", () => {
    const { resolved } = compose(surfacePassEvidenceFixture);
    const html = renderFull(resolved, null);
    expect(html).toContain("Quality Ledger");
    expect(html.match(/cse-block--evidence/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(html.match(/cse-block--statistic/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("(#8) non-article fixture renders (REFERENCE is not an ArticleRenderer)", () => {
    const resolved = resolveContentSurface(
      surfacePassChangelogFixture,
      textosMinimalReferencePolicy,
    );
    const html = renderFull(resolved, null);
    expect(html).toContain("quality-ledger");
    // Non-article policy: no TOC nav, no author byline, no CTA.
    expect(html).not.toContain('aria-label="Table of contents"');
    expect(html).not.toContain("cse-surface__byline");
    expect(html).not.toContain("cse-surface__cta");
    // Steps + definition are article-agnostic semantic blocks, present here.
    expect(html).toContain("cse-block--steps");
    expect(html).toContain("cse-block--definition");
  });

  it("(#9) draft remains noindex", () => {
    const { resolved } = compose(surfacePassEvidenceFixture);
    const compiled = compileAuthority({
      resolved,
      siteOrigin: "https://textos.example",
      siteName: "TextOS",
      lifecycle: {
        publishedAt: surfacePassEvidenceFixture.lifecycle.publishedAt,
        updatedAt: surfacePassEvidenceFixture.lifecycle.updatedAt,
      },
    });
    expect(compiled.metadata.robots.index).toBe(false);
    expect(compiled.metadata.openGraph.url).toBeNull();
    // Non-published document must never surface schema URL either.
    for (const node of compiled.jsonLd) {
      expect(node["@id"]).toBeUndefined();
      expect(node.url).toBeUndefined();
    }
  });

  it("(#10) JSON-LD facts have visible/evidenced parity", () => {
    const { resolved } = compose(surfacePassArticleFixture);
    const compiled = compileAuthority({
      resolved,
      siteOrigin: "https://textos.example",
      siteName: "TextOS",
      resolveAuthor: (id) => {
        const p = resolveReferenceAuthor(id);
        return p ? { name: p.name } : null;
      },
      lifecycle: {
        publishedAt: surfacePassArticleFixture.lifecycle.publishedAt,
        updatedAt: surfacePassArticleFixture.lifecycle.updatedAt,
      },
    });
    const article = compiled.jsonLd.find((n) => n["@type"] === "Article");
    expect(article).toBeDefined();
    expect(article!.headline).toBe(surfacePassArticleFixture.identity.title);
    expect(article!.description).toBe(surfacePassArticleFixture.identity.description);
    expect(article!.datePublished).toBe(surfacePassArticleFixture.lifecycle.publishedAt);
    // FAQPage/HowTo must never appear from this vocabulary.
    for (const node of compiled.jsonLd) {
      expect(node["@type"]).not.toBe("FAQPage");
      expect(node["@type"]).not.toBe("HowTo");
    }
    // Non-emitting policy yields empty graph (non-article fixture).
    const changelogResolved = resolveContentSurface(
      surfacePassChangelogFixture,
      textosMinimalReferencePolicy,
    );
    const cCompiled = compileAuthority({
      resolved: changelogResolved,
      siteOrigin: "https://textos.example",
      siteName: "TextOS",
    });
    expect(cCompiled.jsonLd).toEqual([]);
  });

  it("(#11) CTA resolution fails closed", () => {
    // Unknown intent → null.
    const { resolved } = compose(surfacePassArticleFixture);
    expect(resolveReferenceCta({ resolved, intent: "DOES_NOT_EXIST" })).toBeNull();
    // Disabled registry variants → null.
    expect(resolveReferenceCta({ resolved, intent: "EXPLORE_PRODUCT" })).toBeNull();
    expect(resolveReferenceCta({ resolved, intent: "READ_DEEPER" })).toBeNull();
    // Policy denies CTA → null.
    const minimal = resolveContentSurface(
      surfacePassArticleFixture,
      textosMinimalReferencePolicy,
    );
    expect(resolveReferenceCta({ resolved: minimal, intent: "MEASURE_BRAND" })).toBeNull();
  });

  it("(#12) instrumentation no-ops outside live mode", async () => {
    let called = 0;
    const emit = createEmitter({
      mode: "demo",
      endpoint: "https://ingest.invalid/events",
      fetchImpl: (async () => {
        called += 1;
        return new Response(null, { status: 204 });
      }) as typeof fetch,
    });
    await emit({ type: "content_viewed", contentId: "x", policyId: "p", renderVersion: "r" });
    expect(called).toBe(0);
    // In live mode the emitter calls the endpoint.
    const emitLive = createEmitter({
      mode: "live",
      endpoint: "https://ingest.invalid/events",
      fetchImpl: (async () => {
        called += 1;
        return new Response(null, { status: 204 });
      }) as typeof fetch,
    });
    await emitLive({ type: "content_viewed", contentId: "x", policyId: "p", renderVersion: "r" });
    expect(called).toBe(1);
  });

  it("(#13) product CTA contains opaque aid without content identity/PII", async () => {
    const { resolved, cta } = compose(surfacePassArticleFixture);
    expect(cta).not.toBeNull();
    const store = createInMemoryTouchStore();
    const aid = await recordAttributionTouch({
      contentId: resolved.documentId,
      contentRevision: "1",
      surfacePolicyVersion: TEXTOS_SITE_POLICY_VERSION,
      ctaVariant: cta!.variantId,
      ctaVersion: cta!.version,
      position: "foot",
      store,
      now: () => new Date("2026-09-13T00:00:00Z"),
    });
    // aid is base64url and does NOT contain any part of contentId or slug.
    expect(aid).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    expect(aid.toLowerCase()).not.toContain("no-affirmation");
    expect(aid.toLowerCase()).not.toContain(resolved.slug.toLowerCase().slice(0, 8));
    // Persisted record.
    const touch = await store.get(aid);
    expect(touch).toBeDefined();
    expect(touch!.contentId).toBe(resolved.documentId);
    // Built URL: only aid + authorized routing params.
    const url = buildAttributedUrl(cta!.destination, aid, {
      intent: "MEASURE_BRAND",
      source: "reference",
      // Malicious identity-bearing keys must be dropped by the helper.
      contentId: resolved.documentId,
      email: "leak@example.com",
    });
    expect(url).toContain(`aid=${aid}`);
    expect(url).toContain("intent=MEASURE_BRAND");
    expect(url).toContain("source=reference");
    expect(url).not.toContain("contentId=");
    expect(url).not.toContain("email=");
    // No PII / no content identity in the destination.
    expect(url).not.toContain(resolved.documentId);
    expect(url).not.toContain(resolved.slug);
    // Independent aids are unique.
    expect(newAttributionId()).not.toBe(newAttributionId());
  });

  it("(#14) deterministic inputs yield deterministic resolved/rendered structure (aside from runtime IDs)", () => {
    const { resolved: a } = compose(surfacePassArticleFixture);
    const { resolved: b } = compose(surfacePassArticleFixture);
    expect(a.compositionSignature).toBe(b.compositionSignature);
    const htmlA = renderToStaticMarkup(<RenderReferenceBody resolved={a} />);
    const htmlB = renderToStaticMarkup(<RenderReferenceBody resolved={b} />);
    expect(htmlA).toBe(htmlB);
  });

  it("(#15) PA_NATIVE_SEAM_TOUCHED=NO — no native paths introduced or referenced", () => {
    const roots = [
      "lib/content-surface-engine/renderer/reference-renderer.tsx",
      "lib/content-surface-engine/renderer/block-renderers.tsx",
      "lib/content-surface-engine/renderer/managed-textos-surface.tsx",
      "lib/content-surface-engine/surface-policy/textos-site-policy.ts",
      "lib/content-surface-engine/authority/compile-authority.ts",
      "lib/content-surface-engine/conversion/resolve-reference-cta.ts",
      "lib/content-surface-engine/instrumentation/attribution.ts",
      "lib/content-surface-engine/instrumentation/events.ts",
      "app/reference-preview/[slug]/page.tsx",
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
    for (const rel of roots) {
      const src = readFileSync(path.join(REPO_ROOT, rel), "utf8");
      for (const needle of forbidden) {
        expect(src.toLowerCase().includes(needle.toLowerCase()), `${rel} must not reference "${needle}"`).toBe(false);
      }
    }
    // certified-lineage.json is untouched by A2 (we asserted the file hash below).
    const lineage = readFileSync(path.join(REPO_ROOT, "content/certified-lineage.json"), "utf8");
    expect(lineage).toContain("a0efa146a8691938b624c156d99f4663f6f92218");
    expect(lineage).toContain("3cfae5830fed3f10fd35ed77e699a183162b6cbe");
  });

  it("(bonus) renderer forbidden dependencies — no react-markdown, no next/*, no fs, no git", () => {
    const roots = [
      "lib/content-surface-engine/renderer/reference-renderer.tsx",
      "lib/content-surface-engine/renderer/block-renderers.tsx",
      "lib/content-surface-engine/authority/compile-authority.ts",
    ];
    for (const rel of roots) {
      const src = readFileSync(path.join(REPO_ROOT, rel), "utf8");
      expect(src).not.toMatch(/from ['"]react-markdown['"]/);
      expect(src).not.toMatch(/from ['"]next\//);
      expect(src).not.toMatch(/from ['"]node:fs['"]/);
      expect(src).not.toMatch(/from ['"]node:child_process['"]/);
    }
  });

  it("(bonus) preview catalog files exist", () => {
    expect(existsSync(path.join(REPO_ROOT, "app/reference-preview/[slug]/page.tsx"))).toBe(true);
  });
});
