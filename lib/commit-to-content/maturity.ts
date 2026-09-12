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
