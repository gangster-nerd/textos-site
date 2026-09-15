// A2 — SURFACE_PASS v1 fixtures.
//
// Three representative fixtures cover distinct REFERENCE responsibilities:
//   1. articleFixture    — article-like content (product_article, index=index, CTA).
//   2. evidenceFixture   — evidence-heavy content (many evidence + source + statistic blocks).
//   3. changelogFixture  — non-article content (changelog_entry). Proves REFERENCE is not
//                          secretly an ArticleRenderer.
//
// Each fixture is a valid ContentDocument. All three point to CERTIFIED_MAIN so the
// composition passes the certified-lineage guard.

import type { ContentDocument } from "../../contract/content-document";
import {
  CONTENT_SCHEMA_VERSION,
  ContentDocumentSchema,
} from "../../contract/content-document";

const CERTIFIED_MAIN_SHA = "a0efa146a8691938b624c156d99f4663f6f92218";

export const surfacePassArticleFixture: ContentDocument = ContentDocumentSchema.parse({
  contentSchemaVersion: CONTENT_SCHEMA_VERSION,
  identity: {
    documentId: "a2:article:no-affirmation-without-evidence",
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
    topicIds: ["claim-evidence-and-truth-check"],
  },
  truth: {
    statusVocabulary: "textos.commit-to-content",
    statusVocabularyVersion: "v1",
    sourceStatus: "PRODUCT_PRINCIPLE:DOCUMENTARY:AUTHORITATIVE_MAIN",
    publicationStatus: "published",
    allowedSurfaces: ["reference"],
    claimIds: ["m5-not-observable-is-not-zero"],
    evidenceRefs: ["observe-authority-presence:authority-presence-observation-v1"],
    capabilityIds: ["observe-authority-presence"],
  },
  provenance: {
    sourceRepository: "gangster-nerd/textos-v0",
    sourceSha: CERTIFIED_MAIN_SHA,
    sourceAuthority: "CERTIFIED_MAIN",
  },
  body: [
    { id: "answer", kind: "answer", data: { text: "TextOS blocks drafts that contradict evidence." } },
    { id: "h1", kind: "heading", level: 2, data: { text: "A principle enforced in code" } },
    { id: "p1", kind: "paragraph", data: { text: "The gate is deterministic." } },
    { id: "h2", kind: "heading", level: 2, data: { text: "Two blocking gates" } },
    { id: "p2", kind: "paragraph", data: { text: "Draft against accepted brief, and TruthCheck." } },
    { id: "h3", kind: "heading", level: 2, data: { text: "What non-observable means" } },
    { id: "p3", kind: "paragraph", data: { text: "Absence of evidence is not evidence of absence." } },
    { id: "evidence-1", kind: "evidence", data: { ref: "observe-authority-presence", summary: "Observation unit is defined." } },
    { id: "cta-slot", kind: "cta_slot", slot: "final-cta", data: { intent: "MEASURE_BRAND" } },
    { id: "related-slot", kind: "related_content_slot", slot: "related", data: {} },
    { id: "src-1", kind: "source", data: { ref: "ADR-015", title: "ADR-015 — TruthCheck & generation", href: "https://example.invalid/adr-015" } },
  ],
  relationships: {
    relatedContentIds: ["a2:article:three-measures-never-one-score"],
  },
  conversion: { ctaIntentId: "MEASURE_BRAND", conversionAllowed: true },
  lifecycle: {
    firstPublishedAt: "2026-09-12",
    publishedAt: "2026-09-12",
    updatedAt: "2026-09-13",
    lastReviewedAt: "2026-09-13",
    revisionNumber: 1,
  },
  seo: {
    indexingIntent: "index",
    canonicalPath: "/reference-preview/no-affirmation-without-evidence",
    schemaType: "Article",
    targetQuery: "how does textos avoid hallucinated claims",
    searchIntent: "informational",
  },
});

export const surfacePassEvidenceFixture: ContentDocument = ContentDocumentSchema.parse({
  contentSchemaVersion: CONTENT_SCHEMA_VERSION,
  identity: {
    documentId: "a2:evidence:quality-ledger-observation",
    contentType: "product_article",
    slug: "quality-ledger-observation",
    language: "en",
    title: "Quality Ledger — evidence-heavy walkthrough",
    description:
      "How quality-ledger reports authority observations with dispersion and completeness.",
  },
  editorial: {
    authorIds: ["textos-editorial-team"],
    reviewerIds: [],
    primaryTopicId: "quality-ledger-and-provenance",
    topicIds: ["quality-ledger-and-provenance"],
  },
  truth: {
    statusVocabulary: "textos.commit-to-content",
    statusVocabularyVersion: "v1",
    sourceStatus: "PRODUCT_PRINCIPLE:DOCUMENTARY:AUTHORITATIVE_MAIN",
    publicationStatus: "draft",
    allowedSurfaces: ["reference"],
    claimIds: ["m6-quality-ledger-contextualises"],
    evidenceRefs: [
      "quality-ledger:quality-ledger-rates-v1",
      "observe-authority-presence:authority-presence-observation-v1",
    ],
    capabilityIds: ["quality-ledger", "observe-authority-presence"],
  },
  provenance: {
    sourceRepository: "gangster-nerd/textos-v0",
    sourceSha: CERTIFIED_MAIN_SHA,
    sourceAuthority: "CERTIFIED_MAIN",
  },
  body: [
    { id: "answer", kind: "answer", data: { text: "Every reported rate carries its dispersion and its completeness." } },
    { id: "h1", kind: "heading", level: 2, data: { text: "Observation, not optimization" } },
    { id: "p1", kind: "paragraph", data: { text: "The ledger records what was observed." } },
    { id: "stat-1", kind: "statistic", data: { value: "0.42", label: "authority-presence rate (dispersion 0.05)" } },
    { id: "stat-2", kind: "statistic", data: { value: "84%", label: "panel completeness" } },
    { id: "evidence-1", kind: "evidence", data: { ref: "quality-ledger:quality-ledger-rates-v1", summary: "Rate v1 emission." } },
    { id: "evidence-2", kind: "evidence", data: { ref: "observe-authority-presence:authority-presence-observation-v1", summary: "Observation unit." } },
    { id: "quote-1", kind: "quote", data: { text: "Not observable is not zero.", attribution: "TextOS doctrine" } },
    { id: "callout-1", kind: "callout", data: { tone: "warning", title: "Caveat", text: "A single run is never a rate." } },
    { id: "src-1", kind: "source", data: { ref: "ADR-014", title: "ADR-014 — quality-ledger", href: "https://example.invalid/adr-014" } },
    { id: "src-2", kind: "source", data: { ref: "ADR-015", title: "ADR-015 — TruthCheck & generation", href: "https://example.invalid/adr-015" } },
  ],
  relationships: { relatedContentIds: [] },
  conversion: { conversionAllowed: false },
  lifecycle: { publishedAt: "2026-09-11", updatedAt: "2026-09-13", revisionNumber: 0 },
  seo: { indexingIntent: "noindex", canonicalPath: "/reference-preview/quality-ledger-observation", schemaType: "Article" },
});

export const surfacePassChangelogFixture: ContentDocument = ContentDocumentSchema.parse({
  contentSchemaVersion: CONTENT_SCHEMA_VERSION,
  identity: {
    documentId: "a2:changelog:2026-09-13-rates-v1",
    contentType: "changelog_entry",
    slug: "2026-09-13-rates-v1",
    language: "en",
    title: "quality-ledger — rates v1 shipped",
    description:
      "quality-ledger now emits per-observation confidence bands with published rates.",
  },
  editorial: { authorIds: [], reviewerIds: [], topicIds: [] },
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
    { id: "steps", kind: "steps", data: { items: ["Enable v1 flag", "Read rates via SDK", "Diff dispersion across runs"] } },
    { id: "def-1", kind: "definition", data: { term: "confidence band", definition: "Range of rates within the observed dispersion." } },
    { id: "src-1", kind: "source", data: { ref: "quality-ledger:quality-ledger-rates-v1", title: "Rates v1 evidence bundle" } },
  ],
  relationships: { relatedContentIds: [] },
  conversion: { conversionAllowed: false },
  lifecycle: { publishedAt: "2026-09-13", updatedAt: "2026-09-13" },
  seo: { indexingIntent: "noindex", canonicalPath: "/reference-preview/2026-09-13-rates-v1" },
});

export const surfacePassFixtures = {
  article: surfacePassArticleFixture,
  evidence: surfacePassEvidenceFixture,
  changelog: surfacePassChangelogFixture,
} as const;
