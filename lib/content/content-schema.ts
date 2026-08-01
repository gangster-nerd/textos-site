import { z } from "zod";

export const ContentTypeSchema = z.enum([
  "developer_note",
  "changelog_entry",
  "faq_entry",
  "product_article",
]);

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
