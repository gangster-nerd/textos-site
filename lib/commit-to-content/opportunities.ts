// Modèle d'OPPORTUNITÉS de contenu — un commit produit peut légitimement produire du contenu
// même sans nouveau delta de capacité GA.

import type { ProductManifest } from "@/lib/product-manifest/manifest-schema";

import { MATURITY_DECLARATIONS } from "./maturity-declarations";
import { manifestCeiling, reconcileMaturity } from "./maturity";
import type { PublicMaturity } from "./maturity";
import type { CapabilityDelta, ProductSourceRef } from "./types";

export const OPPORTUNITY_KINDS = [
  "CAPABILITY_DELTA",
  "PRODUCT_KNOWLEDGE_DELTA",
  "MARKETING_OPPORTUNITY_DELTA",
  "CONTENT_COVERAGE_GAP",
  "NARRATIVE_DRIFT",
  "BETA_MATURITY_CHANGE",
  "LABS_MATURITY_CHANGE",
] as const;
export type OpportunityKind = (typeof OPPORTUNITY_KINDS)[number];

export interface ContentOpportunity {
  kind: OpportunityKind;
  capabilityId: string | null;
  proposedMaturity: PublicMaturity | null;
  effectiveMaturity: PublicMaturity | null;
  wasClamped: boolean;
  publicWording: string | null;
  cta: "measurement_request" | "contact" | "labs_signup" | "none" | null;
  surface: string | null;
  reason: string;
}

export function detectOpportunities(args: {
  pinnedManifest: ProductManifest;
  targetRef: ProductSourceRef;
  delta: CapabilityDelta;
}): ContentOpportunity[] {
  const out: ContentOpportunity[] = [];

  // 1. CAPABILITY_DELTA : traité par le module compute-delta. Ici on émet un signal négatif
  // quand le delta est vide.
  if (
    args.delta.addedEntityIds.length === 0 &&
    args.delta.removedEntityIds.length === 0 &&
    args.delta.changedEntityIds.length === 0 &&
    !args.delta.declarationDiverged
  ) {
    out.push({
      kind: "CAPABILITY_DELTA",
      capabilityId: null,
      proposedMaturity: null,
      effectiveMaturity: null,
      wasClamped: false,
      publicWording: null,
      cta: null,
      surface: null,
      reason: "Aucun delta GA à cette ref. Le contenu peut néanmoins bouger via d'autres signaux.",
    });
  }

  // 2. LABS_MATURITY_CHANGE + BETA_MATURITY_CHANGE : parcourir les déclarations éditoriales,
  // les réconcilier avec le plafond manifeste, émettre une opportunité par entrée éligible.
  for (const decl of MATURITY_DECLARATIONS) {
    const ceiling = manifestCeiling(args.pinnedManifest, decl.capabilityId);
    const { effective, wasClamped, reason } = reconcileMaturity({
      proposed: decl.proposedMaturity,
      ceiling,
    });
    const kind: OpportunityKind =
      effective === "PUBLIC_BETA"
        ? "BETA_MATURITY_CHANGE"
        : effective === "PUBLIC_EARLY_ACCESS"
          ? "BETA_MATURITY_CHANGE"
          : effective === "INTERNAL_LABS"
            ? "LABS_MATURITY_CHANGE"
            : effective === "PUBLIC_ROADMAP"
              ? "MARKETING_OPPORTUNITY_DELTA"
              : "PRODUCT_KNOWLEDGE_DELTA";
    out.push({
      kind,
      capabilityId: decl.capabilityId,
      proposedMaturity: decl.proposedMaturity,
      effectiveMaturity: effective,
      wasClamped,
      publicWording: decl.publicWording,
      cta: decl.cta,
      surface: decl.surface,
      reason,
    });
  }

  // 3. CONTENT_COVERAGE_GAP : si une capacité `public_marketable` du manifeste n'a AUCUNE
  // déclaration de maturité côté site, c'est une couverture manquante à documenter.
  const declaredIds = new Set(MATURITY_DECLARATIONS.map((d) => d.capabilityId));
  for (const entity of args.pinnedManifest.entities) {
    if (entity.publicationStatus !== "public_marketable") continue;
    if (declaredIds.has(entity.id)) continue;
    out.push({
      kind: "CONTENT_COVERAGE_GAP",
      capabilityId: entity.id,
      proposedMaturity: "PUBLIC_GA",
      effectiveMaturity: "PUBLIC_GA",
      wasClamped: false,
      publicWording: null,
      cta: null,
      surface: null,
      reason: `Capacité GA "${entity.id}" sans entrée maturity-declarations. Non bloquant — signale une couverture Labs/roadmap à compléter si utile.`,
    });
  }

  return out;
}
