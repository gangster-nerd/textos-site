// Taxonomie de maturité PUBLIQUE — override CPO.
//
// Le manifeste produit (schemaVersion 2) ne connaît que
// {internal_only, candidate, public_marketable, risky, unsupported, forbidden}. Cette
// taxonomie de MATURITÉ est un SUR-ENSEMBLE côté site, alimenté par :
//
//   1. la vérité produit (le manifeste) : source d'IMPLÉMENTATION,
//   2. une déclaration éditoriale locale (maturity-declarations.ts) : source de POLITIQUE
//      de communication décidée par le CPO.
//
// Les deux doivent être présents pour qu'une capacité soit communicable dans un état de maturité
// donné. Une déclaration éditoriale sans implémentation → BLOCKED. Une implémentation sans
// déclaration éditoriale → PRIVATE par défaut.
//
// Aucun état ne DÉBLOQUE automatiquement une communication publique : la revue PO reste le
// seul gate qui merge.

import type { ProductManifest } from "@/lib/product-manifest/manifest-schema";

// Troisième axe — AUTORITÉ DE DIVULGATION PUBLIQUE.
//
// Une capacité peut être MATURE et le manifeste peut permettre de la communiquer, sans que
// TextOS ait accordé une autorisation formelle de le faire. Ce troisième axe DOIT être présent
// et positif pour qu'un candidat éditorial atteigne PUBLIC_SAFE.
//
// - IMPLICIT_MANIFEST_MARKETABLE : le manifeste dit `public_marketable`. C'est l'autorité de
//   divulgation implicite historique du site.
// - CPO_DISCLOSURE_APPROVED : décision CPO explicite, hors manifeste (ex : COMPANY_TECHNOLOGY
//   story). Doit être ancré sur une trace de décision datée + surface restreinte.
// - NONE : pas d'autorité — PRIVATE par défaut.
export const DISCLOSURE_AUTHORITIES = [
  "IMPLICIT_MANIFEST_MARKETABLE",
  "CPO_DISCLOSURE_APPROVED",
  "NONE",
] as const;
export type DisclosureAuthority = (typeof DISCLOSURE_AUTHORITIES)[number];

// Nature de l'histoire éditoriale — un candidat n'est jamais gouverné pareil selon qu'il
// s'agit d'une capacité produit ou d'une histoire technologique d'entreprise.
//
// - PRODUCT_CAPABILITY : gouvernée par le manifeste textos-v0. Autorité = publicationStatus.
// - COMPANY_TECHNOLOGY : histoire d'ingénierie / méthodologie / how-we-build. Exige une
//   autorité de divulgation CPO explicite, CTA = none, surface restreinte.
export const STORY_KINDS = ["PRODUCT_CAPABILITY", "COMPANY_TECHNOLOGY"] as const;
export type StoryKind = (typeof STORY_KINDS)[number];

export const PUBLIC_MATURITY = [
  "PUBLIC_GA",
  "PUBLIC_BETA",
  "PUBLIC_EARLY_ACCESS",
  "PUBLIC_ROADMAP",
  "INTERNAL_LABS",
  "PRIVATE",
  "FORBIDDEN",
] as const;
export type PublicMaturity = (typeof PUBLIC_MATURITY)[number];

// Copy contract par état — appliqué comme lint sur les squelettes émis.
export const MATURITY_COPY_CONTRACT: Record<PublicMaturity, {
  mayImply: readonly string[];
  mustNotImply: readonly string[];
  ctaAllowed: readonly ("measurement_request" | "contact" | "labs_signup" | "none")[];
}> = {
  PUBLIC_GA: {
    mayImply: ["available", "supported", "documented"],
    mustNotImply: [],
    ctaAllowed: ["measurement_request", "contact"],
  },
  PUBLIC_BETA: {
    mayImply: [
      "Beta",
      "Available for selected customers",
      "Available on request",
      "Design partners welcome",
      "Contact us to activate",
    ],
    mustNotImply: [
      "self-service activation",
      "GA-level reliability",
      "one-click integration",
      "universal compatibility",
      "production-scale SLA",
    ],
    ctaAllowed: ["contact", "labs_signup"],
  },
  PUBLIC_EARLY_ACCESS: {
    mayImply: [
      "Early access",
      "Design partners",
      "Manual engineering support",
      "Selected activation",
    ],
    mustNotImply: [
      "self-service activation",
      "GA-level reliability",
      "one-click integration",
      "universal compatibility",
      "production-scale SLA",
    ],
    ctaAllowed: ["contact", "labs_signup"],
  },
  PUBLIC_ROADMAP: {
    mayImply: ["Planned", "Coming next", "Roadmap"],
    mustNotImply: ["Available today", "Ready", "In beta"],
    ctaAllowed: ["contact", "none"],
  },
  INTERNAL_LABS: {
    mayImply: [
      "Labs",
      "How we build",
      "Internal system",
      "Used to build the product",
    ],
    mustNotImply: [
      "Customer feature",
      "Available",
      "Buy",
      "Sign up",
    ],
    ctaAllowed: ["none"],
  },
  PRIVATE: {
    mayImply: [],
    mustNotImply: ["Available", "Beta", "Early access", "Labs"],
    ctaAllowed: ["none"],
  },
  FORBIDDEN: {
    mayImply: [],
    mustNotImply: [],
    ctaAllowed: ["none"],
  },
};

// Rôle du manifeste dans le calcul de maturité : il RESTREINT. Si le manifeste dit `forbidden`,
// la maturité DOIT être FORBIDDEN — aucune déclaration éditoriale ne peut la lever. Si le
// manifeste dit `internal_only`, la seule maturité publique tolérée est INTERNAL_LABS ou
// PUBLIC_ROADMAP, jamais BETA/EARLY_ACCESS/GA.
//
// Une déclaration éditoriale PROPOSE ; le manifeste peut LIMITER ; le PO REVIEWER décide.

export function manifestCeiling(
  manifest: ProductManifest,
  capabilityId: string,
): PublicMaturity {
  const entity = manifest.entities.find((e) => e.id === capabilityId);
  if (!entity) return "PRIVATE";
  switch (entity.publicationStatus) {
    case "forbidden":
      return "FORBIDDEN";
    case "internal_only":
      // Communication publique possible SEULEMENT en position labs / roadmap. Jamais beta / GA.
      return "INTERNAL_LABS";
    case "candidate":
      return "PUBLIC_EARLY_ACCESS";
    case "public_marketable":
      return "PUBLIC_GA";
    case "risky":
    case "unsupported":
      return "PRIVATE";
    default:
      return "PRIVATE";
  }
}

// Fonction de réconciliation : la maturité effective est le MIN(proposé, plafond).
// L'ordre de force décroissante (du plus permissif au plus restrictif) :
const MATURITY_ORDER: PublicMaturity[] = [
  "PUBLIC_GA",
  "PUBLIC_BETA",
  "PUBLIC_EARLY_ACCESS",
  "PUBLIC_ROADMAP",
  "INTERNAL_LABS",
  "PRIVATE",
  "FORBIDDEN",
];

function rank(m: PublicMaturity): number {
  return MATURITY_ORDER.indexOf(m);
}

// Sur-couche autorité de divulgation : sans autorité positive, la maturité effective est
// TOUJOURS PRIVATE, quels que soient la proposition et le plafond manifeste.
export function effectiveMaturityWithAuthority(args: {
  proposed: PublicMaturity;
  ceiling: PublicMaturity;
  authority: DisclosureAuthority;
  storyKind: StoryKind;
}): { effective: PublicMaturity; wasClamped: boolean; reason: string } {
  if (args.authority === "NONE") {
    return {
      effective: "PRIVATE",
      wasClamped: args.proposed !== "PRIVATE",
      reason:
        "Aucune autorité de divulgation (disclosureAuthority=NONE). internal_only, candidate ou implémentation ne suffisent pas.",
    };
  }
  if (args.storyKind === "COMPANY_TECHNOLOGY") {
    // Une COMPANY_TECHNOLOGY n'est PAS une capacité produit — le plafond manifeste ne
    // s'applique pas. En contrepartie, elle est TERMINALEMENT plafonnée à INTERNAL_LABS :
    // toute maturité publique commerciale (GA/BETA/EARLY_ACCESS/ROADMAP) exigerait une
    // requalification en storyKind=PRODUCT_CAPABILITY et une nouvelle gouvernance manifeste.
    const companyCap = clampToCompanyTechnology(args.proposed);
    if (args.authority !== "CPO_DISCLOSURE_APPROVED") {
      return {
        effective: "PRIVATE",
        wasClamped: true,
        reason:
          "COMPANY_TECHNOLOGY sans autorité CPO explicite — reste PRIVATE.",
      };
    }
    return {
      effective: companyCap,
      wasClamped: companyCap !== args.proposed,
      reason:
        "COMPANY_TECHNOLOGY story approuvée CPO — non gouvernée par le manifeste produit mais TERMINALEMENT plafonnée à INTERNAL_LABS (toute promotion commerciale exige une requalification PRODUCT_CAPABILITY).",
    };
  }
  // Sinon (IMPLICIT_MANIFEST_MARKETABLE, ou CPO_DISCLOSURE_APPROVED sur PRODUCT_CAPABILITY) :
  // rejouer le plafond manifeste normalement.
  return reconcileMaturity({ proposed: args.proposed, ceiling: args.ceiling });
}

// Plafond terminal COMPANY_TECHNOLOGY : jamais commercial. Toute proposition GA/BETA/
// EARLY_ACCESS/ROADMAP est réduite à INTERNAL_LABS. PRIVATE et FORBIDDEN traversent tel quel.
export function clampToCompanyTechnology(proposed: PublicMaturity): PublicMaturity {
  switch (proposed) {
    case "PUBLIC_GA":
    case "PUBLIC_BETA":
    case "PUBLIC_EARLY_ACCESS":
    case "PUBLIC_ROADMAP":
      return "INTERNAL_LABS";
    case "INTERNAL_LABS":
    case "PRIVATE":
    case "FORBIDDEN":
      return proposed;
  }
}

export function reconcileMaturity(args: {
  proposed: PublicMaturity;
  ceiling: PublicMaturity;
}): { effective: PublicMaturity; wasClamped: boolean; reason: string } {
  if (args.ceiling === "FORBIDDEN") {
    return {
      effective: "FORBIDDEN",
      wasClamped: args.proposed !== "FORBIDDEN",
      reason: "Manifeste = forbidden ; aucune communication publique tolérée.",
    };
  }
  if (rank(args.proposed) < rank(args.ceiling)) {
    return {
      effective: args.ceiling,
      wasClamped: true,
      reason: `Déclaration éditoriale proposait ${args.proposed} mais le plafond manifeste est ${args.ceiling}.`,
    };
  }
  return {
    effective: args.proposed,
    wasClamped: false,
    reason: "Déclaration éditoriale conforme au plafond manifeste.",
  };
}
