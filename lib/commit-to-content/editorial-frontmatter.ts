// Schéma STRICT du frontmatter éditorial — CTC-7.
//
// Un candidat éditorial doit déclarer explicitement ses métadonnées gouvernées. Aucun
// fallback silencieux : `surface`, `classification`, `sourceProductRef`, `truthLevel`,
// `basisCapabilities`, `basisClaimIds`, `disclosureAuthority`, `proposedPublishability`,
// `language`, `humanReviewRequired` sont OBLIGATOIRES.
//
// Pour COMPANY_TECHNOLOGY, six champs supplémentaires sont exigés :
// `capabilityId`, `storyKind`, `publicMaturity`, `disclosureDecisionRef`, `cta`,
// `appliesToPublicRoute`.

import { z } from "zod";

import {
  DISCLOSURE_AUTHORITIES,
  PUBLIC_MATURITY,
  STORY_KINDS,
} from "./maturity";
import { TRUTH_LEVELS } from "./types";

const CLASSIFICATIONS = [
  "CAPABILITY_CHANGE",
  "PRODUCT_KNOWLEDGE_DELTA",
  "MARKETING_OPPORTUNITY_DELTA",
  "CONTENT_COVERAGE_GAP",
  "NARRATIVE_DRIFT",
  "COPY_CLARIFICATION",
  "NO_CHANGE",
  "LABS_MATURITY_CHANGE",
] as const;

const PUBLISHABILITY = [
  "PUBLIC_SAFE",
  "REQUIRES_HUMAN_REVIEW",
  "WAITING_FOR_PRODUCT_MAIN",
  "BLOCKED",
] as const;

const BaseSchema = z
  .object({
    surface: z.string().min(1),
    classification: z.enum(CLASSIFICATIONS),
    sourceProductRef: z.string().regex(/^[0-9a-f]{40}$/, "SHA-40 attendu"),
    truthLevel: z.enum(TRUTH_LEVELS),
    basisCapabilities: z.array(z.string().min(1)),
    basisClaimIds: z.array(z.string().min(1)),
    disclosureAuthority: z.enum(DISCLOSURE_AUTHORITIES),
    proposedPublishability: z.enum(PUBLISHABILITY),
    language: z.enum(["en", "fr"]),
    humanReviewRequired: z.boolean(),
    // COMPANY_TECHNOLOGY extras (optionnels au niveau base ; requis conditionnellement).
    capabilityId: z.string().min(1).optional(),
    storyKind: z.enum(STORY_KINDS).optional(),
    publicMaturity: z.enum(PUBLIC_MATURITY).optional(),
    disclosureDecisionRef: z.string().min(1).optional(),
    cta: z.enum(["measurement_request", "contact", "labs_signup", "none"]).optional(),
    appliesToPublicRoute: z.boolean().optional(),
    mentionsCommitToContent: z.boolean().optional(),
    // Evidence documentaire pour histoire technologique (COMPANY_TECHNOLOGY).
    implementationEvidence: z.array(z.string().min(1)).optional(),
  })
  .strict();

export const EditorialFrontmatterSchema = BaseSchema.superRefine((d, ctx) => {
  const isCompanyTech = d.storyKind === "COMPANY_TECHNOLOGY";
  if (isCompanyTech) {
    for (const field of [
      "capabilityId",
      "storyKind",
      "publicMaturity",
      "disclosureDecisionRef",
      "cta",
      "appliesToPublicRoute",
    ] as const) {
      if (d[field] === undefined) {
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: `COMPANY_TECHNOLOGY exige explicitement ${field}.`,
        });
      }
    }
    if (d.cta && d.cta !== "none") {
      ctx.addIssue({
        code: "custom",
        path: ["cta"],
        message: "COMPANY_TECHNOLOGY exige cta=none.",
      });
    }
    if (d.appliesToPublicRoute === true) {
      ctx.addIssue({
        code: "custom",
        path: ["appliesToPublicRoute"],
        message: "COMPANY_TECHNOLOGY ne peut PAS s'appliquer à une route publique.",
      });
    }
  }
  // Un candidat qui n'est pas NO_CHANGE doit apporter des bindings positifs. NO_CHANGE peut
  // tolérer des arrays vides s'il ne fait aucune affirmation produit positive.
  if (
    d.classification !== "NO_CHANGE" &&
    d.classification !== "LABS_MATURITY_CHANGE" &&
    d.basisCapabilities.length === 0 &&
    d.basisClaimIds.length === 0
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["basisCapabilities"],
      message: `classification=${d.classification} exige au moins un binding capacité ou claim.`,
    });
  }
});

export type EditorialFrontmatter = z.infer<typeof EditorialFrontmatterSchema>;

// Canonique COMPANY_TECHNOLOGY pour l'histoire commit-to-content — CTC-7 §3 renforcé
// en CTC-8 §2 : ancrage sur le chemin canonique du candidat OU sur `storyKind`, PAS
// uniquement sur `capabilityId` (mutable). `capabilityId` figure explicitement dans le
// contrat pour bloquer toute mutation vers un autre id.
export const COMMIT_TO_CONTENT_CANONICAL_EDITORIAL_PATH =
  "editorial/commit-to-content-technology-story.md";

export const COMMIT_TO_CONTENT_CANONICAL_FRONTMATTER = {
  capabilityId: "commit-to-content" as const,
  storyKind: "COMPANY_TECHNOLOGY" as const,
  publicMaturity: "INTERNAL_LABS" as const,
  disclosureAuthority: "CPO_DISCLOSURE_APPROVED" as const,
  disclosureDecisionRef:
    "docs/decisions/CPO-2026-09-12-commit-to-content-disclosure.md" as const,
  cta: "none" as const,
  appliesToPublicRoute: false,
  proposedPublishability: "REQUIRES_HUMAN_REVIEW" as const,
};
