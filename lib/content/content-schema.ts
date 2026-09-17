import { z } from "zod";

import { CONTENT_TYPES } from "./content-types";

// Littéraux importés du module partagé (`content-types.ts`) : les registres CTA / visuel en ont
// besoin pour leurs `allowedContentTypes` et ne peuvent donc pas importer ce schéma (cycle).
export const ContentTypeSchema = z.enum(CONTENT_TYPES);

export const EditorialStatusSchema = z.enum([
  "draft",
  "review",
  "published",
  "archived",
]);

export const IndexingPolicySchema = z.enum(["index", "noindex"]);

const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "format attendu YYYY-MM-DD");

export const ContentFrontmatterSchema = z
  .object({
    title: z.string().min(1).max(120),
    description: z.string().min(1).max(160),
    contentType: ContentTypeSchema,
    language: z.enum(["en", "fr"]),

    editorialStatus: EditorialStatusSchema,
    indexingPolicy: IndexingPolicySchema,

    publishedAt: IsoDate,
    updatedAt: IsoDate,
    // PROVENANCE. `sourceCommit: z.string().min(7)` a été remplacé : sept caractères quelconques
    // avaient l'apparence d'une provenance sans en être une, et le champ portait déjà deux
    // sémantiques incompatibles dans le contenu rédigé (SHA du dépôt produit ici, SHA du dépôt du
    // SITE là). Un commit unique ne peut d'ailleurs pas prouver les deux à quatre capacités qu'une
    // page invoque — d'où des références de preuve multiples.
    productSnapshotSha: z
      .string()
      .regex(/^[0-9a-f]{40}$/, "SHA produit complet attendu (40 hex)"),
    // `capabilityId:bundleId` — résolus contre le manifeste produit épinglé par les gates.
    // A1R producer-schema evolution : `.min(1)` retiré. Le contrat A1R autorise les
    // articles COMPANY_TECHNOLOGY (et équivalents) à publier avec zero evidence /
    // capability / claim. La contrainte par classe éditoriale reste appliquée par les
    // gates métier — pas par ce schéma structurel.
    evidenceRefs: z.array(
      z.string().regex(/^[a-z0-9-]+:[a-z0-9-]+$/, 'format attendu "capacite:bundle"'),
    ),

    capabilityIds: z.array(z.string().min(1)),
    claimIds: z.array(z.string().min(1)),

    // Taxonomie + conversion. Le contenu déclare des IDENTIFIANTS ; la copy CTA,
    // les destinations et les métadonnées visuelles vivent dans leurs registres.
    // La forme est validée ici ; l'appartenance aux registres est vérifiée par les gates.
    clusterId: z.string().min(1),
    ctaVariant: z.string().min(1),
    visualIds: z.array(z.string().min(1)).optional(),

    targetQuery: z.string().min(1),
    searchIntent: z.enum([
      "informational",
      "technical",
      "commercial_investigation",
      "navigational",
    ]),
    shortAnswer: z.object({
      body: z.string().min(1).max(400),
      claimIds: z.array(z.string().min(1)).min(1),
    }),

    // A1R producer-schema extension : additive optional keys that the A1R Markdown
    // compiler owns. Declaring them here (instead of `.passthrough()`) preserves the
    // strict-unknown-key rejection for foreign keys (e.g., a content author attempting
    // to smuggle a `ctaCopy` field) while unblocking A1R-authored files.
    authorId: z.string().regex(/^[a-z0-9-]+$/).optional(),
    reviewerIds: z.array(z.string().regex(/^[a-z0-9-]+$/)).optional(),
    primaryTopicId: z.string().min(1).optional(),
    topicIds: z.array(z.string().min(1)).optional(),
    audience: z
      .enum(["reader-marketing", "reader-technical", "reader-executive", "reader-mixed"])
      .optional(),
    funnelStage: z
      .enum(["awareness", "consideration", "decision", "expansion", "retention"])
      .optional(),
    relatedContentIds: z.array(z.string().min(1)).optional(),
    firstPublishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    lastReviewedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    revisionNumber: z.number().int().nonnegative().optional(),
    revisionSummary: z.string().min(1).optional(),
    schemaType: z.enum(["Article", "TechArticle", "BlogPosting"]).optional(),
    editorialClass: z
      .enum([
        "CURRENT_CAPABILITY",
        "PRODUCT_PRINCIPLE",
        "ARCHITECTURE_DECISION",
        "ENGINEERING_NOTE",
        "EXPERIMENT",
        "ROADMAP_DIRECTION",
        "RETROSPECTIVE",
        "COMPANY_TECHNOLOGY",
      ])
      .optional(),
    truthMode: z.enum(["AUTHORITATIVE", "DOCUMENTARY", "PROSPECTIVE"]).optional(),
    sourcePaths: z.array(z.string().min(1)).optional(),
    sourceSemantics: z
      .enum([
        "ACCEPTED_ADR",
        "IMPLEMENTATION_EVIDENCE",
        "VERIFIED_CHANGE_RECORD",
        "HISTORICAL_SPRINT_INTENT",
        "ROADMAP_DIRECTION",
        "GOVERNANCE_DECISION",
      ])
      .optional(),
    sourceDigests: z
      .record(z.string().min(1), z.string().regex(/^[0-9a-f]{64}$/))
      .optional(),
    disclaimer: z.string().min(1).optional(),
    image: z
      .object({
        src: z.string().regex(/^\/[a-z0-9/_.-]+$/),
        alt: z.string().min(1),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      })
      .optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.editorialStatus !== "published" && value.indexingPolicy === "index") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["indexingPolicy"],
        message: 'Seul un contenu "published" peut porter indexingPolicy: "index".',
      });
    }
    if (value.updatedAt < value.publishedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["updatedAt"],
        message: "updatedAt ne peut pas précéder publishedAt.",
      });
    }
    const global = new Set(value.claimIds);
    for (const id of value.shortAnswer.claimIds) {
      if (!global.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["shortAnswer", "claimIds"],
          message: `Le shortAnswer utilise ${id}, absent des claimIds du document.`,
        });
      }
    }
  });

export type ContentFrontmatter = z.infer<typeof ContentFrontmatterSchema>;
