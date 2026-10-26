// Entrée self-serve — le CTA qui mène du site public au produit (ENTRY-1, `entry-handoff@1`).
//
// AUTH-CONVERGENCE-0 §10 (textos-v0) : « Public site owns CTA + handoff URL only. Product
// `/auth/start` owns authentication. » Le site ne connaît donc qu'une URL de passage et une intention
// fermée (`measure`) ; il ne sait rien de l'identité, des organisations ni des routes internes.
//
// Pourquoi HORS du registre CTA : le registre gouverne des destinations INTERNES (une page du site,
// livrée, avec ses mentions) et refuse explicitement toute destination externe. Une entrée produit
// est externe par nature ; elle a donc sa propre porte, aussi stricte, et aucune exemption n'est
// ajoutée au registre.
//
// TROIS conditions, toutes requises, sinon rien n'est rendu (jamais de bouton grisé ni de « bientôt ») :
//   1. ÉLIGIBILITÉ PRODUIT — `selfServeCtaGate` sur le manifeste épinglé : `self-serve-onboarding`,
//      `authenticated-product-entry` et `ui-measurement-launch` sont `public_marketable` avec une
//      surface commerciale. C'est la décision de publication de Marc, côté produit ; le site ne
//      peut pas la prendre à sa place.
//   2. URL DE PASSAGE CONFIGURÉE — `PRODUCT_ENTRY_URL`, absolue, https, chemin EXACT `/auth/start`
//      (le contrat) ; sans requête ni fragment. C'est la bascule opérationnelle, par environnement.
//   3. CONVERSION NON COUPÉE — `CONVERSION_MODE=off` reste le coupe-circuit global de toute
//      proposition commerciale.
//
// L'attribution ajoutée est EXACTEMENT celle de `buildCtaAttributionHref` : le produit la valide
// tout ou rien et la journalise sans donnée personnelle.

import { buildCtaAttributionHref, type CtaAttributionPosition } from "@/lib/content-surface-engine/conversion/build-cta-attribution";
import type { SelfServeGateOutput } from "@/lib/commit-to-content/publishability";

import type { ConversionMode } from "./conversion-config";

export const PRODUCT_ENTRY_VARIANT = "product_entry";
export const PRODUCT_ENTRY_COPY_VERSION = 1;
export const PRODUCT_ENTRY_PATH = "/auth/start";

/** Copy publique — aucune promesse de délai, de gratuité ni de résultat (FORBIDDEN_CONVERSION_PHRASES). */
export const PRODUCT_ENTRY_COPY = {
  title: "Run your first measurement in TextOS",
  body:
    "Sign in with your email, describe your brand and approve the questions to observe. TextOS then measures how answer engines cite you on that panel.",
  primaryLabel: "Go to TextOS",
  disclaimer:
    "Nothing is measured before you approve the question panel. Results are observations on that panel, not a ranking.",
} as const;

export type ProductEntryRefusal =
  | "conversion_off"
  | "self_serve_not_published"
  | "entry_url_missing"
  | "entry_url_invalid";

export type ProductEntryDecision =
  | { readonly kind: "render"; readonly href: string }
  | { readonly kind: "none"; readonly reason: ProductEntryRefusal };

/** URL de passage valide : https absolue, chemin exact du contrat, sans requête ni fragment ni identifiants. */
export function parseProductEntryUrl(raw: string | undefined | null): URL | null {
  if (!raw || raw.trim() === "") return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (url.pathname !== PRODUCT_ENTRY_PATH) return null;
  if (url.search || url.hash) return null;
  return url;
}

export function decideProductEntry(input: {
  readonly mode: ConversionMode;
  readonly gate: Pick<SelfServeGateOutput, "eligible">;
  readonly entryUrl: string | undefined | null;
  readonly contentId: string;
  readonly position: CtaAttributionPosition;
}): ProductEntryDecision {
  if (input.mode === "off") return { kind: "none", reason: "conversion_off" };
  if (!input.gate.eligible) return { kind: "none", reason: "self_serve_not_published" };
  if (!input.entryUrl || input.entryUrl.trim() === "") return { kind: "none", reason: "entry_url_missing" };
  const url = parseProductEntryUrl(input.entryUrl);
  if (url === null) return { kind: "none", reason: "entry_url_invalid" };
  return {
    kind: "render",
    href: buildCtaAttributionHref({
      destination: `${url.origin}${PRODUCT_ENTRY_PATH}?intent=measure`,
      contentId: input.contentId,
      ctaVariant: PRODUCT_ENTRY_VARIANT,
      ctaVersion: PRODUCT_ENTRY_COPY_VERSION,
      position: input.position,
      contentRevision: 0,
    }),
  };
}
