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

// CTC-9 §2 — classification éditoriale de la vérité. Seul CURRENT_CAPABILITY est gouverné
// comme une revendication de disponibilité. Les sept autres classes sont des contenus de
// thought-leadership autorisés par la décision CMO du 2026-09-12 sous copy-safety strict.
export const EDITORIAL_CLASSES = [
  "CURRENT_CAPABILITY",
  "PRODUCT_PRINCIPLE",
  "ARCHITECTURE_DECISION",
  "ENGINEERING_NOTE",
  "EXPERIMENT",
  "ROADMAP_DIRECTION",
  "RETROSPECTIVE",
  "COMPANY_TECHNOLOGY",
] as const;
export const EditorialClassSchema = z.enum(EDITORIAL_CLASSES);

// Sémantique de la source produit lue.
export const SOURCE_SEMANTICS = [
  "ACCEPTED_ADR",
  "IMPLEMENTATION_EVIDENCE",
  "VERIFIED_CHANGE_RECORD",
  "HISTORICAL_SPRINT_INTENT",
  "ROADMAP_DIRECTION",
  "GOVERNANCE_DECISION",
] as const;
export const SourceSemanticsSchema = z.enum(SOURCE_SEMANTICS);

// Mode de vérité effectif d'un article.
export const TRUTH_MODES = ["AUTHORITATIVE", "DOCUMENTARY", "PROSPECTIVE"] as const;
export const TruthModeSchema = z.enum(TRUTH_MODES);

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
    // ≥1 requise pour toute classe éditoriale adossée à une capacité produit ; le refinement
    // en fin de schéma laisse COMPANY_TECHNOLOGY vide (article "how we build" sans capacité).
    evidenceRefs: z.array(
      z.string().regex(/^[a-z0-9-]+:[a-z0-9-]+$/, 'format attendu "capacite:bundle"'),
    ),

    // CTC-9-A : capabilityIds/claimIds requièrent ≥1 entrée pour toute classe éditoriale
    // adossée à une capacité produit. Le refinement en fin de schéma fait exception UNIQUEMENT
    // pour COMPANY_TECHNOLOGY où l'article raconte une histoire d'ingénierie interne sans
    // revendiquer de capacité produit spécifique.
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

    // CTC-9 additions — OPTIONNELLES pour rester rétro-compatibles avec les articles déjà
    // publiés (implicitement CURRENT_CAPABILITY / AUTHORITATIVE). Tout article
    // nouvellement rédigé sous /insights DOIT les déclarer.
    editorialClass: EditorialClassSchema.optional(),
    truthMode: TruthModeSchema.optional(),
    sourcePaths: z.array(z.string().min(1)).optional(),
    sourceSemantics: SourceSemanticsSchema.optional(),
    sourceDigests: z.record(z.string().min(1), z.string().regex(/^[0-9a-f]{64}$/)).optional(),
    disclaimer: z.string().min(1).optional(),

    // CTC-ARTICLE-SYSTEM-1 additions — obligatoires côté insight-verifier pour tout nouvel
    // article /insights. Restent OPTIONNELS au niveau schéma pour rétrocompatibilité des
    // articles methodology/faq legacy (qui ne les portent pas).
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
    // CTO §1 : un article draft n'a pas encore été relu — accepter null explicitement plutôt
    // que de forcer une date d'archive de migration à passer pour une revue humaine.
    lastReviewedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    revisionNumber: z.number().int().nonnegative().optional(),
    revisionSummary: z.string().min(1).optional(),
    schemaType: z.enum(["Article", "TechArticle", "BlogPosting"]).optional(),
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
    // CTC-9 §2/§3 — contraintes croisées editorialClass × truthMode × cta × disclaimer.
    if (value.editorialClass === "ROADMAP_DIRECTION") {
      if (value.truthMode && value.truthMode !== "PROSPECTIVE") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["truthMode"],
          message: "ROADMAP_DIRECTION exige truthMode=PROSPECTIVE.",
        });
      }
      if (
        !value.disclaimer ||
        !value.disclaimer.includes("Direction under exploration — not a delivery commitment.")
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["disclaimer"],
          message:
            'ROADMAP_DIRECTION exige disclaimer contenant exactement "Direction under exploration — not a delivery commitment.".',
        });
      }
    }
    if (
      (value.editorialClass === "EXPERIMENT" ||
        value.editorialClass === "COMPANY_TECHNOLOGY") &&
      value.ctaVariant !== "none"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ctaVariant"],
        message: `${value.editorialClass} exige ctaVariant=none.`,
      });
    }
    if (value.editorialClass === "CURRENT_CAPABILITY" && value.truthMode === "PROSPECTIVE") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["truthMode"],
        message: "CURRENT_CAPABILITY ne peut pas être PROSPECTIVE.",
      });
    }
    // Semantic min-1 : toutes les classes SAUF COMPANY_TECHNOLOGY doivent revendiquer au moins
    // une capacité, un claim et une preuve. COMPANY_TECHNOLOGY narre "how we build" sans
    // capacité produit spécifique et donc sans bundle de preuve manifest.
    if (value.editorialClass !== "COMPANY_TECHNOLOGY") {
      if (value.capabilityIds.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["capabilityIds"],
          message: "Au moins une capacité requise (COMPANY_TECHNOLOGY seul peut être vide).",
        });
      }
      if (value.claimIds.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["claimIds"],
          message: "Au moins un claim requis (COMPANY_TECHNOLOGY seul peut être vide).",
        });
      }
      if (value.evidenceRefs.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["evidenceRefs"],
          message: "Au moins un evidence ref requis (COMPANY_TECHNOLOGY seul peut être vide).",
        });
      }
    }
  });

export type ContentFrontmatter = z.infer<typeof ContentFrontmatterSchema>;
