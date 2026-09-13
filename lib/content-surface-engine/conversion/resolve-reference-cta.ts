// CSE-2 — CTA resolution for the REFERENCE surface.
//
// The CTA registry is the authority on which sales propositions may appear on which surface.
// This bridge maps semantic CTA intents carried on a ContentDocument (opaque `ctaIntentId`
// strings, see contract/content-document.ts / ConversionSchema) to CTA variants approved for
// the TextOS reference surface. Fail-closed: unknown intents, disabled variants, missing
// destinations all resolve to `null`.
//
// Semantic intents (mission-declared candidates):
//   * MEASURE_BRAND   → `measurement_request` (approved on `product_article` surface)
//   * EXPLORE_PRODUCT → currently no approved variant (fail-closed placeholder)
//   * READ_DEEPER     → currently no approved variant (fail-closed placeholder)
//
// The bridge NEVER hardcodes a product URL. Every destination comes from the registry.

import type { CtaVariant } from "@/lib/conversion/cta-registry";
import { getCtaVariant } from "@/lib/conversion/cta-registry";
import type { ResolvedContentSurface } from "../contract/resolved-content-surface";

export type SemanticCtaIntent =
  | "MEASURE_BRAND"
  | "EXPLORE_PRODUCT"
  | "READ_DEEPER";

const INTENT_TO_REGISTRY_ID: Record<SemanticCtaIntent, string> = {
  MEASURE_BRAND: "measurement_request",
  EXPLORE_PRODUCT: "claim_lookup", // currently disabled — resolves to null
  READ_DEEPER: "trial", // currently disabled — resolves to null
};

export interface ResolvedReferenceCta {
  intent: SemanticCtaIntent;
  variantId: string;
  version: number;
  title: string;
  body: string;
  primaryLabel: string;
  destination: string;
  disclaimer: string | null;
}

export interface ResolveReferenceCtaInput {
  resolved: ResolvedContentSurface;
  intent: string;
}

function isSemanticIntent(candidate: string): candidate is SemanticCtaIntent {
  return candidate === "MEASURE_BRAND"
    || candidate === "EXPLORE_PRODUCT"
    || candidate === "READ_DEEPER";
}

function acceptable(variant: CtaVariant | undefined): variant is CtaVariant & { destination: string } {
  if (!variant) return false;
  if (variant.status !== "approved") return false;
  if (variant.destination === null) return false;
  return true;
}

/**
 * Resolve a semantic CTA intent for a given resolved surface. Returns `null` when:
 *   - the surface policy denies CTAs (`resolved.conversion.effectiveCtaAllowed === false`)
 *   - the intent is not recognized
 *   - the registry variant is not `approved` or has no destination
 *   - the variant is not authorized on the reference `product_article` surface
 *
 * Never throws. The renderer must accept `null` as "no CTA rendered" — no grey button, no
 * "coming soon", no dead link.
 */
export function resolveReferenceCta(input: ResolveReferenceCtaInput): ResolvedReferenceCta | null {
  const { resolved, intent } = input;
  if (!resolved.conversion.effectiveCtaAllowed) return null;
  if (!isSemanticIntent(intent)) return null;

  const registryId = INTENT_TO_REGISTRY_ID[intent];
  const variant = getCtaVariant(registryId);
  if (!acceptable(variant)) return null;

  // Reference is a product_article surface (per TextOS policy); the variant must permit it.
  if (!variant.allowedSurfaces.includes("product_article")) return null;

  return {
    intent,
    variantId: variant.id,
    version: variant.version,
    title: variant.title,
    body: variant.body,
    primaryLabel: variant.primaryLabel,
    destination: variant.destination,
    disclaimer: variant.disclaimer ?? null,
  };
}
