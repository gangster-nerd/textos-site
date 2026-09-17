// PR21-FINAL-RELEASE-GATE §4 — release-safety environment fixtures A–G.
//
// The preview-visibility decision must be a POSITIVE authorisation. Nothing
// leaks from the indexing axis into the visibility axis. `showDraftContent` is
// TRUE only under Vercel Preview or an explicit local flag ; every other
// environment hides drafts.

import { describe, expect, it } from "vitest";

import { computePreviewVisibility } from "@/lib/config/preview-visibility";

describe("PR21 §4 — preview visibility fixtures A–G", () => {
  it("A. VERCEL_ENV=production + indexing off → drafts HIDDEN", () => {
    const d = computePreviewVisibility({
      env: {
        VERCEL_ENV: "production",
        PUBLIC_INDEXABLE_BUILD: "false",
        PUBLIC_ORIGIN_APPROVED: "false",
      },
    });
    expect(d.showDraftContent).toBe(false);
    expect(d.mode).toBe("PRODUCTION");
  });

  it("B. VERCEL_ENV=production + public origin approved + indexing false → drafts HIDDEN", () => {
    const d = computePreviewVisibility({
      env: {
        VERCEL_ENV: "production",
        PUBLIC_ORIGIN_APPROVED: "true",
        PUBLIC_INDEXABLE_BUILD: "false",
      },
    });
    expect(d.showDraftContent).toBe(false);
    expect(d.mode).toBe("PRODUCTION");
  });

  it("C. VERCEL_ENV=production + CONTENT_PREVIEW_MODE=true → configuration FAIL", () => {
    expect(() =>
      computePreviewVisibility({
        env: {
          VERCEL_ENV: "production",
          CONTENT_PREVIEW_MODE: "true",
        },
      }),
    ).toThrow(/preview-visibility.*Production/);
  });

  it("D. VERCEL_ENV=preview → drafts visible (Vercel Preview surface)", () => {
    const d = computePreviewVisibility({ env: { VERCEL_ENV: "preview" } });
    expect(d.showDraftContent).toBe(true);
    expect(d.mode).toBe("VERCEL_PREVIEW");
  });

  it("E. local CONTENT_PREVIEW_MODE=true → drafts visible", () => {
    const d = computePreviewVisibility({
      env: { CONTENT_PREVIEW_MODE: "true" },
    });
    expect(d.showDraftContent).toBe(true);
    expect(d.mode).toBe("EXPLICIT_LOCAL_PREVIEW");
  });

  it("F. unclassified environment → drafts HIDDEN (default fail-closed)", () => {
    const d = computePreviewVisibility({ env: {} });
    expect(d.showDraftContent).toBe(false);
    expect(d.mode).toBe("DEFAULT_HIDDEN");
  });

  it("G. published content eligibility is independent of visibility axis", () => {
    // A production build with public-eligible content still ships those pages
    // regardless of preview mode. The visibility decision is about DRAFTS only.
    // Assertion : the returned decision NEVER carries a flag about published
    // content ; it is orthogonal.
    for (const env of [
      { VERCEL_ENV: "production", PUBLIC_INDEXABLE_BUILD: "true" },
      { VERCEL_ENV: "preview" },
      { CONTENT_PREVIEW_MODE: "true" },
      {},
    ]) {
      const d = computePreviewVisibility({ env });
      expect(typeof d.showDraftContent).toBe("boolean");
      // No `showPublishedContent` field exists — it's out of scope for this
      // module by design.
      expect((d as { showPublishedContent?: unknown }).showPublishedContent).toBeUndefined();
    }
  });
});

describe("PR21 §2 — visibility never leaks from indexing signals", () => {
  const NON_VISIBILITY_KEYS = [
    "PUBLIC_INDEXABLE_BUILD",
    "PUBLIC_ORIGIN_APPROVED",
    "SITE_ORIGIN",
  ];

  it.each(NON_VISIBILITY_KEYS)(
    "%s cannot confer draft visibility on its own",
    (key) => {
      const d = computePreviewVisibility({ env: { [key]: "true" } });
      expect(d.showDraftContent).toBe(false);
    },
  );
});
