// Requêtes de promotion opérationnelles — pour CHAQUE déclaration éditoriale, produire une
// demande machine + humaine listant précisément qui doit décider quoi pour lever le clamp.

import type { ProductManifest } from "@/lib/product-manifest/manifest-schema";

import { MATURITY_DECLARATIONS } from "./maturity-declarations";
import type { MaturityDeclaration } from "./maturity-declarations";
import {
  MATURITY_COPY_CONTRACT,
  effectiveMaturityWithAuthority,
  manifestCeiling,
  reconcileMaturity,
} from "./maturity";
import type {
  DisclosureAuthority,
  PublicMaturity,
  StoryKind,
} from "./maturity";
import type { ProductSourceRef } from "./types";

export const PROMOTION_ROUTES = [
  "PRODUCT_MANIFEST_ENTRY_REQUIRED",
  "PRODUCT_MAIN_REQUIRED",
  "CPO_DISCLOSURE_APPROVAL_REQUIRED",
  "EVIDENCE_INSUFFICIENT",
  "NO_PROMOTION_REQUIRED",
] as const;
export type PromotionRoute = (typeof PROMOTION_ROUTES)[number];

export interface PromotionRequest {
  capabilityId: string;
  storyKind: StoryKind;
  sourceProductRef: string;
  implementationEvidence: readonly string[];
  currentImplementationStatus: string | null;
  currentPublicationStatus: string | null;
  requestedPublicMaturity: PublicMaturity;
  effectivePublicMaturity: PublicMaturity;
  manifestCeiling: PublicMaturity;
  disclosureAuthority: DisclosureAuthority;
  clamped: boolean;
  promotionRequired: boolean;
  requestedManifestChange: string | null;
  customerDeliverableNow: boolean;
  manualEngineeringRequired: boolean;
  allowedWording: readonly string[];
  prohibitedWording: readonly string[];
  allowedCtas: readonly ("measurement_request" | "contact" | "labs_signup" | "none")[];
  blockingReason: string;
  requiredOwner: "T0" | "PO" | "CPO" | "NONE";
  requiredNextAction: string;
  route: PromotionRoute;
}

export function buildPromotionRequests(args: {
  pinnedManifest: ProductManifest;
  targetRef: ProductSourceRef;
}): PromotionRequest[] {
  return MATURITY_DECLARATIONS.map((decl) =>
    buildOne({ decl, pinnedManifest: args.pinnedManifest, targetRef: args.targetRef }),
  );
}

function buildOne(args: {
  decl: MaturityDeclaration;
  pinnedManifest: ProductManifest;
  targetRef: ProductSourceRef;
}): PromotionRequest {
  const { decl } = args;
  const entity = args.pinnedManifest.entities.find((e) => e.id === decl.capabilityId);
  const ceiling = manifestCeiling(args.pinnedManifest, decl.capabilityId);
  const { effective, wasClamped } = effectiveMaturityWithAuthority({
    proposed: decl.proposedMaturity,
    ceiling,
    authority: decl.disclosureAuthority,
    storyKind: decl.storyKind,
  });
  const contract = MATURITY_COPY_CONTRACT[effective];

  const route = classifyRoute({ decl, entity, ceiling, effective });
  const { requiredOwner, requiredNextAction, requestedManifestChange, blockingReason } =
    resolveOwnerAction({ decl, route, ceiling, effective });

  return {
    capabilityId: decl.capabilityId,
    storyKind: decl.storyKind,
    sourceProductRef: args.targetRef.sha,
    implementationEvidence: decl.evidenceRefs,
    currentImplementationStatus: entity?.implementationStatus ?? null,
    currentPublicationStatus: entity?.publicationStatus ?? null,
    requestedPublicMaturity: decl.proposedMaturity,
    effectivePublicMaturity: effective,
    manifestCeiling: ceiling,
    disclosureAuthority: decl.disclosureAuthority,
    clamped: wasClamped,
    promotionRequired: wasClamped,
    requestedManifestChange,
    customerDeliverableNow: inferCustomerDeliverable(decl),
    manualEngineeringRequired: inferManualEngineering(decl),
    allowedWording: contract.mayImply,
    prohibitedWording: decl.prohibitedWording,
    allowedCtas: contract.ctaAllowed,
    blockingReason,
    requiredOwner,
    requiredNextAction,
    route,
  };
}

function classifyRoute(args: {
  decl: MaturityDeclaration;
  entity: ReturnType<ProductManifest["entities"]["find"]> | undefined;
  ceiling: PublicMaturity;
  effective: PublicMaturity;
}): PromotionRoute {
  // COMPANY_TECHNOLOGY approuvée = pas de promotion produit requise.
  if (
    args.decl.storyKind === "COMPANY_TECHNOLOGY" &&
    args.decl.disclosureAuthority === "CPO_DISCLOSURE_APPROVED"
  ) {
    return "NO_PROMOTION_REQUIRED";
  }
  // Pas de trace d'implémentation solide → preuve insuffisante.
  if (args.decl.evidenceRefs.length === 0) return "EVIDENCE_INSUFFICIENT";
  // Absent du manifeste = entrée manquante.
  if (!args.entity) return "PRODUCT_MANIFEST_ENTRY_REQUIRED";
  // Présent mais internal_only + PRODUCT_CAPABILITY sans autorité CPO = approbation CPO
  // requise (ou promotion produit du publicationStatus).
  if (args.entity.publicationStatus === "internal_only") {
    return "CPO_DISCLOSURE_APPROVAL_REQUIRED";
  }
  // Cas résiduel — la ceiling manifeste couvre déjà.
  return "NO_PROMOTION_REQUIRED";
}

function resolveOwnerAction(args: {
  decl: MaturityDeclaration;
  route: PromotionRoute;
  ceiling: PublicMaturity;
  effective: PublicMaturity;
}): {
  requiredOwner: PromotionRequest["requiredOwner"];
  requiredNextAction: string;
  requestedManifestChange: string | null;
  blockingReason: string;
} {
  switch (args.route) {
    case "NO_PROMOTION_REQUIRED":
      return {
        requiredOwner: "NONE",
        requiredNextAction: "Aucune action requise pour ce cycle.",
        requestedManifestChange: null,
        blockingReason: "—",
      };
    case "EVIDENCE_INSUFFICIENT":
      return {
        requiredOwner: "PO",
        requiredNextAction:
          "Documenter la preuve d'implémentation (paths, commits, ADR) avant toute promotion.",
        requestedManifestChange: null,
        blockingReason: "Aucune preuve d'implémentation attachée à la déclaration éditoriale.",
      };
    case "PRODUCT_MANIFEST_ENTRY_REQUIRED":
      return {
        requiredOwner: "T0",
        requiredNextAction: `Ajouter l'entité "${args.decl.capabilityId}" au manifeste produit (capability-declaration.ts) et réémettre un artefact push/main. Puis ré-import via product-manifest/IMPORT.md.`,
        requestedManifestChange: `entity ${args.decl.capabilityId} publicationStatus ← ${suggestManifestStatus(args.decl.proposedMaturity)}`,
        blockingReason: `Capacité absente du manifeste épinglé. Le plafond est PRIVATE, la maturité proposée (${args.decl.proposedMaturity}) est clampée.`,
      };
    case "CPO_DISCLOSURE_APPROVAL_REQUIRED":
      return {
        requiredOwner: "CPO",
        requiredNextAction: `Décision CPO explicite : autoriser une divulgation ${args.decl.proposedMaturity} pour ${args.decl.capabilityId}, avec disclosureDecisionRef daté.`,
        requestedManifestChange: null,
        blockingReason:
          "Manifeste = internal_only. internal_only n'est PAS une autorité de divulgation.",
      };
    case "PRODUCT_MAIN_REQUIRED":
      return {
        requiredOwner: "T0",
        requiredNextAction: "Intégrer la capacité R2 dans product main, puis relancer content:sync.",
        requestedManifestChange: null,
        blockingReason: "Capacité présente uniquement dans la ref CANDIDATE R2 — non-autoritative.",
      };
  }
}

function suggestManifestStatus(m: PublicMaturity): string {
  switch (m) {
    case "PUBLIC_GA":
      return "public_marketable";
    case "PUBLIC_BETA":
    case "PUBLIC_EARLY_ACCESS":
      return "candidate (le vocabulaire manifeste v2 n'a pas encore d'état beta/early_access ; à trancher par T0)";
    case "PUBLIC_ROADMAP":
      return "candidate ou internal_only + intendedPublicState=roadmap (extension schéma)";
    case "INTERNAL_LABS":
      return "internal_only + autorité de divulgation CPO_DISCLOSURE_APPROVED côté site";
    default:
      return "n/a";
  }
}

function inferCustomerDeliverable(decl: MaturityDeclaration): boolean {
  return decl.proposedMaturity === "PUBLIC_GA" || decl.proposedMaturity === "PUBLIC_BETA";
}

function inferManualEngineering(decl: MaturityDeclaration): boolean {
  return (
    decl.proposedMaturity === "PUBLIC_BETA" ||
    decl.proposedMaturity === "PUBLIC_EARLY_ACCESS" ||
    decl.proposedMaturity === "INTERNAL_LABS"
  );
}
