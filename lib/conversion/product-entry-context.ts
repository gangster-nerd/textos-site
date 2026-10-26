import { selfServeCtaGate } from "@/lib/commit-to-content/publishability";
import { loadPinnedManifest } from "@/lib/product-manifest/manifest-schema";

import { conversionConfig } from "./conversion-config";
import { decideProductEntry, type ProductEntryDecision } from "./product-entry";

/**
 * Décision d'entrée produit au BORD : le seul endroit qui lit l'environnement et le manifeste épinglé
 * pour l'entrée self-serve (même rôle que `delivery-context.ts` pour les CTA internes).
 */
export function productEntryForHomepage(): ProductEntryDecision {
  return decideProductEntry({
    mode: conversionConfig.mode,
    gate: selfServeCtaGate(loadPinnedManifest(process.cwd())),
    entryUrl: process.env.PRODUCT_ENTRY_URL,
    contentId: "textos-homepage",
    position: "final",
  });
}
