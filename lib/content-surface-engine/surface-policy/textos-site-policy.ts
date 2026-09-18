// A2 — TextOS SurfacePolicy.
//
// surfacePolicyVersion = "textos-site@2" (CMO-CONVERSION-SURFACE-2).
// Bumped from @1 because the reference article projection now derives a
// ResolvedConversionPlan (commercial CTA placements, editorial next step,
// newsletter retention action) — a materially different presentation contract.
//
// This module owns TextOS-specific presentation decisions: navigation integration, author
// display, content-type presentation, indexability policy, metadata/schema policy, and
// analytics policy. None of these decisions belong in ContentDocument. The policy is a value,
// not a class; it is composed with a ContentDocument by `resolveContentSurface()`.

import type { SurfacePolicy } from "../contract/surface-policy";
import {
  SURFACE_POLICY_VERSION,
  SurfacePolicySchema,
} from "../contract/surface-policy";

export const TEXTOS_SITE_POLICY_ID = "textos-site.reference@2" as const;
export const TEXTOS_SITE_POLICY_VERSION = "textos-site@2" as const;

// TextOS reference presentation for article-like content. Owns navigation, author display,
// CTA authorization at the surface layer, indexability, and metadata emission.
export const textosArticleReferencePolicy: SurfacePolicy = SurfacePolicySchema.parse({
  policyVersion: SURFACE_POLICY_VERSION,
  surface: "reference",
  policyId: TEXTOS_SITE_POLICY_ID,
  blockVisibility: [
    // Slot placeholders remain in the resolved surface; the managed TextOS surface consumes
    // them explicitly. They stay `show` so tests can assert their presence.
    { kind: "cta_slot", action: "show" },
    { kind: "related_content_slot", action: "show" },
  ],
  slotBindings: [
    { slot: "primary-cta", region: "textos.article.body.cta" },
    { slot: "final-cta", region: "textos.article.foot.cta" },
    { slot: "related", region: "textos.article.foot.related" },
  ],
  navigation: {
    showBreadcrumbs: true,
    showTableOfContents: true,
    showRelatedContent: true,
  },
  authorDisplay: { showAuthor: true, showReviewers: true },
  conversion: { allowCta: true },
  metadata: { emitSchemaOrg: true },
  indexability: { allowIndex: true },
  analytics: { surfaceTag: "reference.textos.article" },
});

// TextOS reference presentation for non-article content types (changelog, developer notes,
// FAQ leaves, methodology snippets). Deliberately austere: no CTA, no TOC, no author card.
// Reference is emphatically NOT an article renderer.
export const textosMinimalReferencePolicy: SurfacePolicy = SurfacePolicySchema.parse({
  policyVersion: SURFACE_POLICY_VERSION,
  surface: "reference",
  policyId: "textos-site.reference.minimal@1",
  blockVisibility: [
    { kind: "cta_slot", action: "hide" },
    { kind: "related_content_slot", action: "hide" },
  ],
  slotBindings: [],
  navigation: {
    showBreadcrumbs: false,
    showTableOfContents: false,
    showRelatedContent: false,
  },
  authorDisplay: { showAuthor: false, showReviewers: false },
  conversion: { allowCta: false },
  metadata: { emitSchemaOrg: false },
  indexability: { allowIndex: false },
  analytics: { surfaceTag: "reference.textos.minimal" },
});
