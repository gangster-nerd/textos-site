// COMPOSER — ContentDocument v1.
//
// Neutral semantic publication contract. No React, no Next.js, no CMS, no TextOS-brand
// assumptions, no article-template assumptions. Every field expresses editorial truth or
// semantic body content — never presentation. Presentation is the responsibility of a
// SurfacePolicy applied by resolveContentSurface().
//
// Producers of ContentDocument (Commit to Content, future TextOS Act, other agents) are
// orchestration concerns and are NOT modeled here.

import { z } from "zod";

export const CONTENT_SCHEMA_VERSION = "content-document@1" as const;

// -- publicationStatus ------------------------------------------------------
//
// The ONLY status enum the engine interprets. Product-specific vocabularies (editorial
// classes, truth modes, review states) are opaque and carried alongside via `truth`.
export const PUBLICATION_STATUSES = [
  "draft",
  "review",
  "publishable",
  "published",
  "superseded",
  "archived",
] as const;
export const PublicationStatusSchema = z.enum(PUBLICATION_STATUSES);
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

// Named surface intents the engine can carry. The list is intentionally sparse: it does not
// enumerate product surfaces — each product resolves its own surfaces via SurfacePolicy.
// `reference` = the neutral reference renderer surface used to validate the contract.
// `native`    = a producer-native composition path (e.g. TextOS NativeCompositionPlan).
export const SURFACE_KINDS = ["reference", "native"] as const;
export const SurfaceKindSchema = z.enum(SURFACE_KINDS);
export type SurfaceKind = (typeof SURFACE_KINDS)[number];

// -- Semantic block vocabulary ---------------------------------------------
//
// Blocks are semantic, not visual. No "Hero", no "TwoColumn", no "BlueCard". Blocks describe
// what a fragment MEANS, not how it should look. Layout, order, visibility policy live in
// SurfacePolicy and ResolvedContentSurface.
export const BLOCK_KINDS = [
  "paragraph",
  "heading",
  "answer",
  "evidence",
  "quote",
  "figure",
  "comparison",
  "table",
  "steps",
  "callout",
  "definition",
  "statistic",
  "source",
  "cta_slot",
  "related_content_slot",
] as const;
export const BlockKindSchema = z.enum(BLOCK_KINDS);
export type BlockKind = (typeof BLOCK_KINDS)[number];

// A block carries an intrinsic identity, a kind, and free-form semantic payload the engine
// does not interpret. The engine orders and gates blocks; producers own their meaning.
export const ContentBlockSchema = z
  .object({
    id: z.string().min(1),
    kind: BlockKindSchema,
    // Level applies to headings; ignored elsewhere. The engine does not enforce document
    // heading hierarchy — that is a linter / editorial concern, not a composition concern.
    level: z.number().int().min(1).max(6).optional(),
    // Producer-defined payload. The engine treats it as opaque data.
    data: z.record(z.string(), z.unknown()).default({}),
    // Semantic slot name a SurfacePolicy can bind against. Optional.
    slot: z.string().min(1).optional(),
  })
  .strict();
export type ContentBlock = z.infer<typeof ContentBlockSchema>;

// -- identity ---------------------------------------------------------------
export const IdentitySchema = z
  .object({
    documentId: z.string().min(1),
    contentType: z.string().min(1),
    slug: z.string().min(1),
    language: z.string().min(2).max(8),
    title: z.string().min(1),
    description: z.string().min(1),
  })
  .strict();

// -- editorial --------------------------------------------------------------
//
// Human-facing editorial identity. Authorship, review, topics. Note: the engine does NOT
// compose author biographies or hub navigation. It merely carries identifiers; a
// SurfacePolicy decides what to display.
export const EditorialSchema = z
  .object({
    authorIds: z.array(z.string().min(1)).default([]),
    reviewerIds: z.array(z.string().min(1)).default([]),
    primaryTopicId: z.string().min(1).optional(),
    topicIds: z.array(z.string().min(1)).default([]),
    audience: z.string().min(1).optional(),
    funnelStage: z.string().min(1).optional(),
  })
  .strict();

// -- truth ------------------------------------------------------------------
//
// The status contract boundary. Two normalized fields (publicationStatus, allowedSurfaces)
// are the ONLY fields the engine interprets. statusVocabulary, statusVocabularyVersion and
// sourceStatus are opaque metadata carried forward for audit.
export const TruthSchema = z
  .object({
    statusVocabulary: z.string().min(1),
    statusVocabularyVersion: z.string().min(1),
    sourceStatus: z.string().min(1),

    publicationStatus: PublicationStatusSchema,
    allowedSurfaces: z.array(SurfaceKindSchema).min(1),

    claimIds: z.array(z.string().min(1)).default([]),
    evidenceRefs: z.array(z.string().min(1)).default([]),
    capabilityIds: z.array(z.string().min(1)).default([]),
  })
  .strict();

// -- provenance -------------------------------------------------------------
//
// Producer-agnostic. Git-backed provenance MUST resolve sourceSha against
// content/certified-lineage.json (see composition/provenance-authority.ts). Non-Git producers
// (e.g. TextOS Act) leave sourceSha undefined and identify evidence via
// sourceEvidenceDigest.
export const ProvenanceSchema = z
  .object({
    sourceRepository: z.string().min(1).optional(),
    sourceSha: z
      .string()
      .regex(/^[0-9a-f]{40}$/, "sourceSha must be a full 40-hex Git commit SHA")
      .optional(),
    sourceAuthority: z
      .enum(["CERTIFIED_MAIN", "CERTIFIED_CANDIDATE", "UNCERTIFIED"])
      .default("UNCERTIFIED"),
    sourceEvidenceDigest: z
      .string()
      .regex(/^[0-9a-f]{64}$/, "sourceEvidenceDigest must be a sha256 hex")
      .optional(),
  })
  .strict();

// -- relationships / conversion / lifecycle / seo --------------------------
export const RelationshipsSchema = z
  .object({
    relatedContentIds: z.array(z.string().min(1)).default([]),
  })
  .strict();

export const ConversionSchema = z
  .object({
    // A conversion intent identifier. The engine does NOT know the copy or destination;
    // those live in the consumer registry. Represented as an ID to keep the core neutral.
    ctaIntentId: z.string().min(1).optional(),
    // A hint the SurfacePolicy may honour, deny, or override.
    conversionAllowed: z.boolean().default(true),
  })
  .strict();

const IsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

export const LifecycleSchema = z
  .object({
    firstPublishedAt: IsoDate.nullable().optional(),
    publishedAt: IsoDate.optional(),
    updatedAt: IsoDate.optional(),
    lastReviewedAt: IsoDate.optional(),
    revisionNumber: z.number().int().nonnegative().optional(),
    revisionSummary: z.string().min(1).optional(),
    supersededBy: z.string().min(1).optional(),
  })
  .strict();

export const SeoSchema = z
  .object({
    // The engine does not decide indexability alone — a SurfacePolicy may downgrade a
    // requested `index` intent for its surface. The document merely expresses the editorial
    // intent.
    indexingIntent: z.enum(["index", "noindex"]).default("noindex"),
    canonicalPath: z.string().min(1).optional(),
    schemaType: z.string().min(1).optional(),
    targetQuery: z.string().min(1).optional(),
    searchIntent: z.string().min(1).optional(),
  })
  .strict();

// -- ContentDocument v1 -----------------------------------------------------
export const ContentDocumentSchema = z
  .object({
    contentSchemaVersion: z.literal(CONTENT_SCHEMA_VERSION),
    identity: IdentitySchema,
    editorial: EditorialSchema,
    truth: TruthSchema,
    provenance: ProvenanceSchema,
    body: z.array(ContentBlockSchema),
    relationships: RelationshipsSchema,
    conversion: ConversionSchema,
    lifecycle: LifecycleSchema,
    seo: SeoSchema,
  })
  .strict()
  .superRefine((doc, ctx) => {
    // Non-published documents cannot express `index` intent. This is a shared, product-
    // agnostic invariant: only a `published` document may state an indexing intent that a
    // policy could honour.
    if (doc.truth.publicationStatus !== "published" && doc.seo.indexingIntent === "index") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["seo", "indexingIntent"],
        message: "indexingIntent=index requires publicationStatus=published.",
      });
    }
    // updatedAt cannot precede publishedAt when both are declared.
    if (
      doc.lifecycle.publishedAt &&
      doc.lifecycle.updatedAt &&
      doc.lifecycle.updatedAt < doc.lifecycle.publishedAt
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lifecycle", "updatedAt"],
        message: "updatedAt cannot precede publishedAt.",
      });
    }
    // Block ID uniqueness — a resolved surface must be able to address blocks unambiguously.
    const seen = new Set<string>();
    for (const block of doc.body) {
      if (seen.has(block.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["body"],
          message: `duplicate block id "${block.id}".`,
        });
      }
      seen.add(block.id);
    }
  });

export type ContentDocument = z.infer<typeof ContentDocumentSchema>;
