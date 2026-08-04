// Registre CTA — DONNÉES, validées par Zod au chargement.
//
// Le registre est un CONTRAT EXÉCUTABLE, pas une simple annotation de types : un type TypeScript
// ne prouve rien au runtime (un asset mal formé passerait le typecheck et casserait en prod).
// `CtaRegistrySchema.parse` échoue donc au chargement du module — donc au build.
//
// La résolution (statut, destination, contentType, capacités) vit dans `cta-resolver.ts` : ce
// fichier ne porte que la donnée et sa forme. Aucun consommateur ne réimplémente ces règles.

import { z } from "zod";

import { CONTENT_TYPES } from "@/lib/content/content-types";

export const CTA_VARIANT_IDS = [
  "measurement_request",
  "claim_lookup",
  "trial",
  "none",
] as const;

export type CtaVariantId = (typeof CTA_VARIANT_IDS)[number];
export type CtaStatus = "approved" | "disabled" | "retired";

export const CtaVariantSchema = z
  .object({
    id: z.enum(CTA_VARIANT_IDS),
    status: z.enum(["approved", "disabled", "retired"]),
    requiredCapabilities: z.array(z.string().min(1)),
    allowedContentTypes: z.array(z.enum(CONTENT_TYPES)).min(1),
    destination: z.string().min(1).nullable(),
    title: z.string(),
    body: z.string(),
    primaryLabel: z.string(),
    disclaimer: z.string().min(1).optional(),
    claimIds: z.array(z.string().min(1)),
    version: z.number().int().positive(),
  })
  .strict()
  .superRefine((v, ctx) => {
    // Une variante approved doit être RENDABLE : destination réelle + copy non vide. Un CTA
    // approuvé sans destination serait un lien mort ; sans copy, un bouton muet.
    if (v.status !== "approved") return;
    if (v.destination === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["destination"],
        message: `CTA "${v.id}" est approved sans destination — aucune URL réelle n'existe.`,
      });
    }
    for (const field of ["title", "body", "primaryLabel"] as const) {
      if (!v[field].trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `CTA "${v.id}" est approved sans ${field}.`,
        });
      }
    }
  });

export type CtaVariant = z.infer<typeof CtaVariantSchema>;

export const CtaRegistrySchema = z.record(z.enum(CTA_VARIANT_IDS), CtaVariantSchema);

// État initial S1 : TOUTES les variantes sont `disabled` — aucune destination n'existe encore.
//
// `none` est le sentinel « pas de CTA ». Il est `disabled` comme les autres, et non `approved`
// avec une exemption : un statut `approved` sans destination serait une incohérence que le gate
// devrait apprendre à ignorer, et cette exception finirait par en couvrir d'autres. `none` résout
// toujours vers null, par identité (voir `cta-resolver.ts`) — jamais par accident de statut.
const RAW_CTA_VARIANTS = {
  measurement_request: {
    id: "measurement_request",
    status: "disabled",
    requiredCapabilities: ["observe-authority-presence"],
    allowedContentTypes: ["faq_entry", "product_article"],
    // Destination INTERNE et gouvernée : la page de formulaire vit dans ce repo, pas chez le
    // sous-traitant. Le statut reste `disabled` — le passage à `approved` attend le domaine, le
    // nom public et le SIRET (mentions légales publiables). L'irréversible ne précède pas le
    // réversible : tout est éprouvable ici sans rien publier de définitif.
    destination: "/request-measurement",
    title: "See your brand measured",
    body: "Request an authority-presence measurement on a versioned query panel for your brand.",
    primaryLabel: "Request a measurement",
    claimIds: [
      "sales-authority-presence-measurement",
      "sales-versioned-authority-measurement",
      "sales-authority-presence-boundaries",
    ],
    version: 1,
  },
  claim_lookup: {
    id: "claim_lookup",
    status: "disabled",
    requiredCapabilities: ["claim-evidence-layer"],
    allowedContentTypes: ["faq_entry", "developer_note"],
    destination: null,
    title: "Inspect Answer Evidence",
    body: "Look up captured Answer Evidence and the claims extracted from it.",
    primaryLabel: "Open claim lookup",
    claimIds: ["s8-answer-evidence-capture"],
    version: 1,
  },
  trial: {
    id: "trial",
    status: "disabled",
    requiredCapabilities: [],
    allowedContentTypes: ["faq_entry", "product_article"],
    destination: null,
    title: "Start with TextOS",
    body: "Begin measuring authority presence for your brand.",
    primaryLabel: "Start",
    claimIds: [],
    version: 1,
  },
  none: {
    id: "none",
    status: "disabled",
    requiredCapabilities: [],
    allowedContentTypes: [...CONTENT_TYPES],
    destination: null,
    title: "",
    body: "",
    primaryLabel: "",
    claimIds: [],
    version: 1,
  },
} satisfies Record<CtaVariantId, unknown>;

/** Registre validé. Une malformation échoue ICI, au chargement — donc au build. */
export const CTA_VARIANTS = CtaRegistrySchema.parse(RAW_CTA_VARIANTS) as Record<
  CtaVariantId,
  CtaVariant
>;

export function getCtaVariant(id: string): CtaVariant | undefined {
  return CTA_VARIANTS[id as CtaVariantId];
}
