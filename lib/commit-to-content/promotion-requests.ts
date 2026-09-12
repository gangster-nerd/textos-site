// Requêtes de promotion opérationnelles — CTC-6 (route dépend de la ref cible + evidence
// vérifiée au SHA, customerDeliverableNow explicite, EVIDENCE_INSUFFICIENT réellement
// atteignable).

import type { ProductManifest } from "@/lib/product-manifest/manifest-schema";

import { summarizeEvidence, type EvidenceSummary } from "./evidence";
import { MATURITY_DECLARATIONS } from "./maturity-declarations";
import type { MaturityDeclaration } from "./maturity-declarations";
import {
  MATURITY_COPY_CONTRACT,
  effectiveMaturityWithAuthority,
  manifestCeiling,
} from "./maturity";
import type { DisclosureAuthority, PublicMaturity, StoryKind } from "./maturity";
import {
  AUTHORITATIVE_MAIN_SHA,
  R2_CANDIDATE_SHA,
} from "./resolve-product-ref";
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
  evidenceSupportedAt: EvidenceSummary["supportedAt"]; // authoritative | candidate | both | neither
  currentImplementationStatus: string | null;
  currentPublicationStatus: string | null;
  requestedPublicMaturity: PublicMaturity;
  effectivePublicMaturity: PublicMaturity;
  manifestCeiling: PublicMaturity;
  disclosureAuthority: DisclosureAuthority;
  clamped: boolean;
  promotionRequired: boolean;
  requestedManifestChange: string | null;
  customerDeliverableNow: boolean; // désormais EXPLICITE (declaration.customerDeliverableNow)
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

  // Evidence vérifiée aux DEUX refs whitelistées — la route ne peut pas dépendre du seul SHA
  // demandé (un même bundle produit des routes différentes selon qu'on run sync contre R2 ou
  // main).
  const evidence = decl.storyKind === "COMPANY_TECHNOLOGY"
    ? ({
        hasPathOrGlobEvidence: false,
        supportedAt: "neither" as const,
        resolutions: { authoritative: [], candidate: [] },
      })
    : summarizeEvidence({
        evidenceRefs: decl.evidenceRefs,
        authoritativeSha: AUTHORITATIVE_MAIN_SHA,
        candidateSha: R2_CANDIDATE_SHA,
      });

  const route = classifyRoute({ decl, entity, evidence });
  const { requiredOwner, requiredNextAction, requestedManifestChange, blockingReason } =
    resolveOwnerAction({ decl, route });

  return {
    capabilityId: decl.capabilityId,
    storyKind: decl.storyKind,
    sourceProductRef: args.targetRef.sha,
    implementationEvidence: decl.evidenceRefs,
    evidenceSupportedAt: evidence.supportedAt,
    currentImplementationStatus: entity?.implementationStatus ?? null,
    currentPublicationStatus: entity?.publicationStatus ?? null,
    requestedPublicMaturity: decl.proposedMaturity,
    effectivePublicMaturity: effective,
    manifestCeiling: ceiling,
    disclosureAuthority: decl.disclosureAuthority,
    clamped: wasClamped,
    promotionRequired: wasClamped,
    requestedManifestChange,
    customerDeliverableNow: decl.customerDeliverableNow,
    manualEngineeringRequired: decl.manualEngineeringRequired,
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
  entity: ProductManifest["entities"][number] | undefined;
  evidence: EvidenceSummary;
}): PromotionRoute {
  // COMPANY_TECHNOLOGY approuvée = pas de promotion produit requise (histoire d'entreprise
  // gouvernée par la décision CPO, pas par le manifeste produit).
  if (
    args.decl.storyKind === "COMPANY_TECHNOLOGY" &&
    args.decl.disclosureAuthority === "CPO_DISCLOSURE_APPROVED"
  ) {
    return "NO_PROMOTION_REQUIRED";
  }
  // PRODUCT_CAPABILITY sans AUCUNE preuve path/glob résolvable à l'une des refs whitelistées.
  if (
    args.decl.storyKind === "PRODUCT_CAPABILITY" &&
    !args.evidence.hasPathOrGlobEvidence
  ) {
    return "EVIDENCE_INSUFFICIENT";
  }
  if (
    args.decl.storyKind === "PRODUCT_CAPABILITY" &&
    args.evidence.supportedAt === "neither"
  ) {
    return "EVIDENCE_INSUFFICIENT";
  }
  // Evidence présente à R2 seulement, absente de main autoritatif → PRODUCT_MAIN_REQUIRED.
  // (Gutenberg est exactement ce cas : le vocabulaire natif vit dans R2 uniquement à ce
  // cycle.)
  if (args.evidence.supportedAt === "candidate") {
    return "PRODUCT_MAIN_REQUIRED";
  }
  // Sinon (supportedAt = authoritative OR both) : la capacité EXISTE au SHA autoritatif. Le
  // clamp restant vient donc soit d'une entrée manifeste manquante, soit d'un
  // publicationStatus insuffisant.
  if (!args.entity) return "PRODUCT_MANIFEST_ENTRY_REQUIRED";
  if (args.entity.publicationStatus === "internal_only") {
    return "CPO_DISCLOSURE_APPROVAL_REQUIRED";
  }
  return "NO_PROMOTION_REQUIRED";
}

function resolveOwnerAction(args: {
  decl: MaturityDeclaration;
  route: PromotionRoute;
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
          "Documenter la preuve d'implémentation via des chemins vérifiables au SHA source (path ou glob src/…). ADR seuls ne suffisent pas.",
        requestedManifestChange: null,
        blockingReason:
          "Aucune preuve path/glob résolvable au SHA autoritatif ni au SHA candidat R2.",
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
        requiredNextAction:
          "Intégrer la capacité R2 dans product main autoritatif puis émettre un manifeste. Ré-import via IMPORT.md avant de relancer content:sync.",
        requestedManifestChange: null,
        blockingReason:
          "Capacité présente uniquement à la ref CANDIDATE R2, absente à la ref AUTHORITATIVE_MAIN — non-autoritative.",
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
