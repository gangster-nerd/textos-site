// Demande d'accès à une bêta — le seul CTA d'une page qui parle d'une capacité `public_beta` (ADR-032).
//
// Même porte que l'entrée self-serve (`product-entry.ts`) et pour la même raison : la destination est
// le produit, donc EXTERNE, hors du registre CTA (qui juge des propositions commerciales sur
// `sales_copy` vers des pages internes — une bêta n'est jamais sur `sales_copy`). Le site ne connaît
// qu'une URL de passage et une intention fermée ; le produit garde l'identité et rattache la demande à
// l'organisation existante du client.
//
// QUATRE conditions, toutes requises, sinon rien n'est rendu (jamais de bouton grisé) :
//   1. la capacité est `public_beta` dans le manifeste ÉPINGLÉ (décision du produit) ;
//   2. le site la déclare `public_beta` lui aussi (le vérificateur de dérive bloque toute divergence) ;
//   3. l'URL de passage est configurée et conforme au contrat (`parseProductEntryUrl`) ;
//   4. la conversion n'est pas coupée (`CONVERSION_MODE=off`).
// Une capacité `public_upcoming` n'a pas de CTA ici : « Être prévenu » relève du PLG.

import { buildCtaAttributionHref, type CtaAttributionPosition } from "@/lib/content-surface-engine/conversion/build-cta-attribution";
import type { PublicationStatus } from "@/lib/product-manifest/status-axes";

import type { ConversionMode } from "./conversion-config";
import { PRODUCT_ENTRY_PATH, parseProductEntryUrl } from "./product-entry";

export const BETA_ACCESS_VARIANT = "beta_access";
export const BETA_ACCESS_COPY_VERSION = 1;

/** Copy publique — aucune date, aucune promesse d'activation ni de délai (FORBIDDEN_CONVERSION_PHRASES). */
export const BETA_ACCESS_COPY = {
  title: "Request access to the beta",
  body:
    "Sign in with your work email. If your organisation already uses TextOS, the request is attached to it; no new account is created.",
  primaryLabel: "Request beta access",
  disclaimer: "The TextOS team opens beta access organisation by organisation. A request is not an activation.",
} as const;

export type BetaAccessRefusal =
  | "conversion_off"
  | "not_in_beta"
  | "entry_url_missing"
  | "entry_url_invalid";

export type BetaAccessDecision =
  | { readonly kind: "render"; readonly href: string; readonly capabilityId: string }
  | { readonly kind: "none"; readonly reason: BetaAccessRefusal };

const CAPABILITY_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function decideBetaAccessEntry(input: {
  readonly mode: ConversionMode;
  readonly capabilityId: string;
  /** Statut au manifeste épinglé (`null` : capacité absente). */
  readonly productStatus: PublicationStatus | null;
  readonly siteStatus: PublicationStatus | null;
  readonly entryUrl: string | undefined | null;
  readonly contentId: string;
  readonly position: CtaAttributionPosition;
}): BetaAccessDecision {
  if (input.mode === "off") return { kind: "none", reason: "conversion_off" };
  if (
    !CAPABILITY_ID.test(input.capabilityId) ||
    input.productStatus !== "public_beta" ||
    input.siteStatus !== "public_beta"
  ) {
    return { kind: "none", reason: "not_in_beta" };
  }
  if (!input.entryUrl || input.entryUrl.trim() === "") return { kind: "none", reason: "entry_url_missing" };
  const url = parseProductEntryUrl(input.entryUrl);
  if (url === null) return { kind: "none", reason: "entry_url_invalid" };
  return {
    kind: "render",
    capabilityId: input.capabilityId,
    href: buildCtaAttributionHref({
      destination: `${url.origin}${PRODUCT_ENTRY_PATH}?intent=beta_access&capability=${encodeURIComponent(input.capabilityId)}`,
      contentId: input.contentId,
      ctaVariant: BETA_ACCESS_VARIANT,
      ctaVersion: BETA_ACCESS_COPY_VERSION,
      position: input.position,
      contentRevision: 0,
    }),
  };
}
