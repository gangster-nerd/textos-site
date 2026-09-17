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

import {
  ParagraphNodeSchema,
  HeadingNodeSchema,
  ListNodeSchema,
  BlockquoteNodeSchema,
  TableNodeSchema,
  CodeNodeSchema,
  ThematicBreakNodeSchema,
  ImageNodeSchema,
  HtmlCtaMarkerNodeSchema,
  DefinitionNodeSchema,
  FootnoteDefinitionNodeSchema,
} from "./mdast-semantic";

// Short aliases used by the source-backed ContentBlock variants below. Keeping
// them local avoids repeating the long import names in every variant.
const PARAGRAPH_NODE_REF = ParagraphNodeSchema;
const HEADING_NODE_REF = HeadingNodeSchema;
const LIST_NODE_REF = ListNodeSchema;
const BLOCKQUOTE_NODE_REF = BlockquoteNodeSchema;
const TABLE_NODE_REF = TableNodeSchema;
const CODE_NODE_REF = CodeNodeSchema;
const THEMATIC_BREAK_NODE_REF = ThematicBreakNodeSchema;
const IMAGE_NODE_REF = ImageNodeSchema;
const HTML_CTA_MARKER_NODE_REF = HtmlCtaMarkerNodeSchema;
const DEFINITION_NODE_REF = DefinitionNodeSchema;
const FOOTNOTE_DEFINITION_NODE_REF = FootnoteDefinitionNodeSchema;

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

// A1R-CONTRACT-SEAL-1 — every ContentBlock variant is now a strict discriminated
// object with an explicitly-typed `data` payload. No `z.unknown()`, no
// `z.record(_, z.unknown())`, no `z.any()`. The exported JSON Schema therefore
// encodes the semantic tree contract — a downstream vendorer validates the shape
// with a JSON Schema validator alone, without executing TextOS compiler code.
//
// TWO data-shape families exist per source-backed kind :
//   - SOURCE-BACKED : `data: { mdast: TypedMdastNode }` (strict). The kind
//     constrains the mdast type. Emitted by the TextOS Markdown producer.
//   - SYNTHETIC     : producer-authored fields, per-kind. Kept to admit A2 SURFACE_PASS
//     fixtures and non-Markdown producers without leaking `z.unknown()`.
//
// Every leaf is `.strict()` — an unknown key on any variant fails validation.

// Import the mdast semantic schemas AFTER the file-level enum declarations so
// they can reference BlockKindSchema when needed.
// Deferred import via a require-cycle-safe direct reference : declared here.

// The imports are placed near the top of the module for clarity ; see file header.

// ── source-backed helpers ---------------------------------------------------

const SourceBackedParagraph = z
  .object({
    id: z.string().min(1),
    kind: z.literal("paragraph"),
    slot: z.string().min(1).optional(),
    data: z.object({ mdast: PARAGRAPH_NODE_REF }).strict(),
  })
  .strict();

const SourceBackedHeading = z
  .object({
    id: z.string().min(1),
    kind: z.literal("heading"),
    level: z.number().int().min(1).max(6).optional(),
    slot: z.string().min(1).optional(),
    data: z.object({ mdast: HEADING_NODE_REF }).strict(),
  })
  .strict();

const SourceBackedSteps = z
  .object({
    id: z.string().min(1),
    kind: z.literal("steps"),
    slot: z.string().min(1).optional(),
    data: z.object({ mdast: LIST_NODE_REF }).strict(),
  })
  .strict();

const SourceBackedQuote = z
  .object({
    id: z.string().min(1),
    kind: z.literal("quote"),
    slot: z.string().min(1).optional(),
    data: z.object({ mdast: BLOCKQUOTE_NODE_REF }).strict(),
  })
  .strict();

const SourceBackedTable = z
  .object({
    id: z.string().min(1),
    kind: z.literal("table"),
    slot: z.string().min(1).optional(),
    data: z.object({ mdast: TABLE_NODE_REF }).strict(),
  })
  .strict();

/** callout = code fence OR thematic break in the current compiler. */
const SourceBackedCallout = z
  .object({
    id: z.string().min(1),
    kind: z.literal("callout"),
    slot: z.string().min(1).optional(),
    data: z
      .object({ mdast: z.union([CODE_NODE_REF, THEMATIC_BREAK_NODE_REF]) })
      .strict(),
  })
  .strict();

const SourceBackedFigure = z
  .object({
    id: z.string().min(1),
    kind: z.literal("figure"),
    slot: z.string().min(1).optional(),
    data: z.object({ mdast: IMAGE_NODE_REF }).strict(),
  })
  .strict();

const SourceBackedSource = z
  .object({
    id: z.string().min(1),
    kind: z.literal("source"),
    slot: z.string().min(1).optional(),
    data: z
      .object({ mdast: z.union([DEFINITION_NODE_REF, FOOTNOTE_DEFINITION_NODE_REF]) })
      .strict(),
  })
  .strict();

const SourceBackedCtaSlot = z
  .object({
    id: z.string().min(1),
    kind: z.literal("cta_slot"),
    // A source-backed CTA slot MUST bind to primary-cta ; the html marker only
    // lives at the contextual insertion point.
    slot: z.literal("primary-cta"),
    data: z.object({ mdast: HTML_CTA_MARKER_NODE_REF }).strict(),
  })
  .strict();

// ── synthetic (producer-authored) variants ---------------------------------
//
// These admit the A2 SURFACE_PASS fixtures already checked in on main, plus
// non-Markdown producers. Every payload shape is STRICT.

const SyntheticText = z.object({ text: z.string().min(1) }).strict();

const SyntheticParagraph = z
  .object({
    id: z.string().min(1),
    kind: z.literal("paragraph"),
    slot: z.string().min(1).optional(),
    data: SyntheticText,
  })
  .strict();

const SyntheticHeading = z
  .object({
    id: z.string().min(1),
    kind: z.literal("heading"),
    level: z.number().int().min(1).max(6).optional(),
    slot: z.string().min(1).optional(),
    data: SyntheticText,
  })
  .strict();

const SyntheticAnswer = z
  .object({
    id: z.string().min(1),
    kind: z.literal("answer"),
    slot: z.string().min(1).optional(),
    data: SyntheticText,
  })
  .strict();

const SyntheticSteps = z
  .object({
    id: z.string().min(1),
    kind: z.literal("steps"),
    slot: z.string().min(1).optional(),
    data: z.object({ items: z.array(z.string().min(1)) }).strict(),
  })
  .strict();

const SyntheticQuote = z
  .object({
    id: z.string().min(1),
    kind: z.literal("quote"),
    slot: z.string().min(1).optional(),
    data: z
      .object({ text: z.string().min(1), attribution: z.string().min(1).optional() })
      .strict(),
  })
  .strict();

const SyntheticCallout = z
  .object({
    id: z.string().min(1),
    kind: z.literal("callout"),
    slot: z.string().min(1).optional(),
    data: z
      .object({
        text: z.string().min(1),
        tone: z.string().min(1).optional(),
        title: z.string().min(1).optional(),
      })
      .strict(),
  })
  .strict();

const SyntheticEvidence = z
  .object({
    id: z.string().min(1),
    kind: z.literal("evidence"),
    slot: z.string().min(1).optional(),
    data: z
      .object({
        ref: z.string().min(1),
        summary: z.string().min(1).optional(),
      })
      .strict(),
  })
  .strict();

const SyntheticSource = z
  .object({
    id: z.string().min(1),
    kind: z.literal("source"),
    slot: z.string().min(1).optional(),
    data: z
      .object({
        ref: z.string().min(1),
        title: z.string().min(1).optional(),
        href: z.string().min(1).optional(),
      })
      .strict(),
  })
  .strict();

const SyntheticDefinition = z
  .object({
    id: z.string().min(1),
    kind: z.literal("definition"),
    slot: z.string().min(1).optional(),
    data: z
      .object({ term: z.string().min(1), definition: z.string().min(1) })
      .strict(),
  })
  .strict();

const SyntheticStatistic = z
  .object({
    id: z.string().min(1),
    kind: z.literal("statistic"),
    slot: z.string().min(1).optional(),
    data: z
      .object({ value: z.string().min(1), label: z.string().min(1) })
      .strict(),
  })
  .strict();

const SyntheticComparison = z
  .object({
    id: z.string().min(1),
    kind: z.literal("comparison"),
    slot: z.string().min(1).optional(),
    data: z
      .object({
        left: z.string().min(1),
        right: z.string().min(1),
        label: z.string().min(1).optional(),
      })
      .strict(),
  })
  .strict();

const SyntheticFigure = z
  .object({
    id: z.string().min(1),
    kind: z.literal("figure"),
    slot: z.string().min(1).optional(),
    data: z
      .object({
        src: z.string().min(1),
        alt: z.string().min(1),
        caption: z.string().min(1).optional(),
      })
      .strict(),
  })
  .strict();

const SyntheticTable = z
  .object({
    id: z.string().min(1),
    kind: z.literal("table"),
    slot: z.string().min(1).optional(),
    data: z
      .object({
        columns: z.array(z.string().min(1)),
        rows: z.array(z.array(z.string())),
      })
      .strict(),
  })
  .strict();

const SyntheticCtaSlot = z
  .object({
    id: z.string().min(1),
    kind: z.literal("cta_slot"),
    slot: z.union([z.literal("primary-cta"), z.literal("final-cta"), z.literal("header-cta")]),
    data: z.object({ intent: z.string().min(1) }).strict(),
  })
  .strict();

const SyntheticRelatedContentSlot = z
  .object({
    id: z.string().min(1),
    kind: z.literal("related_content_slot"),
    slot: z.literal("related"),
    data: z.object({}).strict(),
  })
  .strict();

/**
 * ContentBlockSchema — strict union over every allowed block variant.
 *
 * Every alternative is a `.strict()` object with a typed `data` payload. No
 * `z.unknown()`, no `z.any()`. A downstream vendorer validates the semantic
 * tree with a JSON Schema validator alone.
 */
export const ContentBlockSchema = z.union([
  SourceBackedParagraph,
  SourceBackedHeading,
  SourceBackedSteps,
  SourceBackedQuote,
  SourceBackedTable,
  SourceBackedCallout,
  SourceBackedFigure,
  SourceBackedSource,
  SourceBackedCtaSlot,
  SyntheticParagraph,
  SyntheticHeading,
  SyntheticAnswer,
  SyntheticSteps,
  SyntheticQuote,
  SyntheticCallout,
  SyntheticEvidence,
  SyntheticSource,
  SyntheticDefinition,
  SyntheticStatistic,
  SyntheticComparison,
  SyntheticFigure,
  SyntheticTable,
  SyntheticCtaSlot,
  SyntheticRelatedContentSlot,
]);

/**
 * `ContentBlock` widened for TypeScript-level ergonomics. The RUNTIME contract
 * (ContentBlockSchema) enforces the strict per-kind unions above ; the exported
 * TS type preserves the pre-A1R-SEAL-1 access shape so A2 renderer code that
 * dereferences `block.data.text`, `block.data.ref`, `block.level`, etc. keeps
 * compiling. The vendor contract is JSON-Schema-level and is not affected by
 * this ergonomic widening.
 */
export type ContentBlock = {
  id: string;
  kind: BlockKind;
  level?: number;
  slot?: string;
  data: Record<string, unknown>;
};

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

// SEAL-1 : `body` is widened at the TypeScript level (same rationale as the
// ContentBlock widening above) so existing renderer/pipeline code compiles.
// Runtime validation remains strict via ContentBlockSchema in the union.
export type ContentDocument = Omit<z.infer<typeof ContentDocumentSchema>, "body"> & {
  body: ContentBlock[];
};
