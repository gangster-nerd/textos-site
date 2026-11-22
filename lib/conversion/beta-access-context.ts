import { findCapability } from "@/lib/capability-registry";
import { loadPinnedManifest } from "@/lib/product-manifest/manifest-schema";

import { decideBetaAccessEntry, type BetaAccessDecision } from "./beta-access-entry";
import { conversionConfig } from "./conversion-config";

/**
 * Décision de demande d'accès bêta au BORD : le seul endroit qui lit l'environnement et le manifeste
 * épinglé pour ce CTA (même rôle que `product-entry-context.ts`).
 */
export function betaAccessForDocument(capabilityId: string, contentId: string): BetaAccessDecision {
  const manifest = loadPinnedManifest(process.cwd());
  return decideBetaAccessEntry({
    mode: conversionConfig.mode,
    capabilityId,
    productStatus: manifest.entities.find((entity) => entity.id === capabilityId)?.publicationStatus ?? null,
    siteStatus: findCapability(capabilityId)?.publicationStatus ?? null,
    entryUrl: process.env.PRODUCT_ENTRY_URL,
    contentId,
    position: "final",
  });
}
