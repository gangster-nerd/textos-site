// COMPOSER — conformance fixtures.
//
// Two fixtures prove the core is generic:
//
//  - articleFixture: representative TextOS product-article semantics (as used by
//    ARTICLE-SYSTEM-1 corpus). Ensures the shared contract has enough expressive power for
//    the existing 12-article conformance corpus.
//
//  - changelogFixture: a non-article content type (changelog entry). Proves the contract is
//    not accidentally an Article schema.
//
// These fixtures are TEST INPUTS ONLY. They are not consumed by any renderer or route in
// this mission.

import type { ContentDocument } from "../contract/content-document";
import type { SurfacePolicy } from "../contract/surface-policy";
import {
  CONTENT_SCHEMA_VERSION,
  ContentDocumentSchema,
} from "../contract/content-document";
import {
  SURFACE_POLICY_VERSION,
  SurfacePolicySchema,
} from "../contract/surface-policy";

// Certified main SHA from content/certified-lineage.json (T0). Keeping it inline in a test
// fixture is intentional: this proves an integration flow, not a lineage claim.
const CERTIFIED_MAIN_SHA = "a0efa146a8691938b624c156d99f4663f6f92218";

export const articleFixture: ContentDocument = ContentDocumentSchema.parse({
  contentSchemaVersion: CONTENT_SCHEMA_VERSION,
  identity: {
    documentId: "insight:no-affirmation-without-evidence",
    contentType: "product_article",
    slug: "no-affirmation-without-evidence",
    language: "en",
    title: "No affirmation without evidence",
    description:
      "TextOS never lets a draft affirm what the evidence does not support.",
  },
  editorial: {
    authorIds: ["textos-editorial-team"],
    reviewerIds: ["marc-p"],
    primaryTopicId: "claim-evidence-and-truth-check",
    topicIds: ["claim-evidence-and-truth-check", "generation-and-publication"],
    audience: "reader-mixed",
    funnelStage: "consideration",
  },
  truth: {
    statusVocabulary: "textos.commit-to-content",
    statusVocabularyVersion: "v1",
    sourceStatus: "PRODUCT_PRINCIPLE:DOCUMENTARY:AUTHORITATIVE_MAIN",
    publicationStatus: "published",
    allowedSurfaces: ["reference"],
    claimIds: ["m5-not-observable-is-not-zero", "m6-quality-ledger-contextualises"],
    evidenceRefs: ["observe-authority-presence:authority-presence-observation-v1"],
    capabilityIds: ["observe-authority-presence"],
  },
  provenance: {
    sourceRepository: "gangster-nerd/textos-v0",
    sourceSha: CERTIFIED_MAIN_SHA,
    sourceAuthority: "CERTIFIED_MAIN",
  },
  body: [
    { id: "answer-1", kind: "answer", data: { text: "…" } },
    { id: "h1", kind: "heading", level: 2, data: { text: "A principle enforced in code" } },
    { id: "p1", kind: "paragraph", data: { text: "…" } },
    { id: "evidence-1", kind: "evidence", data: { ref: "observe-authority-presence" } },
    { id: "cta-slot-1", kind: "cta_slot", slot: "primary-cta", data: { intent: "measurement_request" } },
    { id: "related-1", kind: "related_content_slot", slot: "related", data: {} },
  ],
  relationships: {
    relatedContentIds: ["insight:three-measures-never-one-score"],
  },
  conversion: {
    ctaIntentId: "measurement_request",
    conversionAllowed: true,
  },
  lifecycle: {
    firstPublishedAt: "2026-09-12",
    publishedAt: "2026-09-12",
    updatedAt: "2026-09-12",
    lastReviewedAt: "2026-09-13",
    revisionNumber: 0,
  },
  seo: {
    indexingIntent: "index",
    canonicalPath: "/insights/no-affirmation-without-evidence",
    schemaType: "Article",
    targetQuery: "how does textos avoid hallucinated claims",
    searchIntent: "informational",
  },
});

// A changelog entry — same neutral contract, different semantics. Uses a distinct product
// status vocabulary. Publication status normalises to `published`, but sourceStatus is a
// wholly different string. This proves two vocabularies converge on the same shared boundary.
export const changelogFixture: ContentDocument = ContentDocumentSchema.parse({
  contentSchemaVersion: CONTENT_SCHEMA_VERSION,
  identity: {
    documentId: "changelog:2026-09-13-quality-ledger-rates-v1",
    contentType: "changelog_entry",
    slug: "2026-09-13-quality-ledger-rates-v1",
    language: "en",
    title: "quality-ledger — rates v1 shipped",
    description:
      "quality-ledger now emits per-observation confidence bands with published rates.",
  },
  editorial: {
    authorIds: ["textos-editorial-team"],
    reviewerIds: [],
    topicIds: ["quality-ledger-and-provenance"],
  },
  truth: {
    statusVocabulary: "textos.release-notes",
    statusVocabularyVersion: "v0.2",
    sourceStatus: "SHIPPED_RELEASE",
    publicationStatus: "published",
    allowedSurfaces: ["reference"],
    claimIds: ["m6-quality-ledger-contextualises"],
    evidenceRefs: ["quality-ledger:quality-ledger-rates-v1"],
    capabilityIds: ["quality-ledger"],
  },
  provenance: {
    sourceRepository: "gangster-nerd/textos-v0",
    sourceSha: CERTIFIED_MAIN_SHA,
    sourceAuthority: "CERTIFIED_MAIN",
  },
  body: [
    { id: "p1", kind: "paragraph", data: { text: "quality-ledger v1 is live." } },
    { id: "steps-1", kind: "steps", data: { items: ["Enable v1 flag", "Read rates via SDK"] } },
    { id: "source-1", kind: "source", data: { ref: "quality-ledger:quality-ledger-rates-v1" } },
  ],
  relationships: { relatedContentIds: [] },
  conversion: { conversionAllowed: false },
  lifecycle: { publishedAt: "2026-09-13", updatedAt: "2026-09-13" },
  seo: { indexingIntent: "noindex" },
});

export const referenceArticlePolicy: SurfacePolicy = SurfacePolicySchema.parse({
  policyVersion: SURFACE_POLICY_VERSION,
  surface: "reference",
  policyId: "reference.article.v1",
  blockVisibility: [{ kind: "related_content_slot", action: "show" }],
  slotBindings: [
    { slot: "primary-cta", region: "article.body.cta" },
    { slot: "related", region: "article.body.related" },
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
  analytics: { surfaceTag: "reference.article" },
});

export const referenceChangelogPolicy: SurfacePolicy = SurfacePolicySchema.parse({
  policyVersion: SURFACE_POLICY_VERSION,
  surface: "reference",
  policyId: "reference.changelog.v1",
  navigation: { showBreadcrumbs: false, showTableOfContents: false, showRelatedContent: false },
  authorDisplay: { showAuthor: false, showReviewers: false },
  conversion: { allowCta: false },
  metadata: { emitSchemaOrg: false },
  indexability: { allowIndex: false },
  analytics: { surfaceTag: "reference.changelog" },
});
