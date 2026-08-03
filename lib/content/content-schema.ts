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
    sourceCommit: z.string().min(7),

    capabilityIds: z.array(z.string().min(1)).min(1),
    claimIds: z.array(z.string().min(1)).min(1),

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
