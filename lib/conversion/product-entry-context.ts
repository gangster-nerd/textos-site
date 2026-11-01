import { selfServeCtaGate } from "@/lib/commit-to-content/publishability";
import { loadPinnedManifest } from "@/lib/product-manifest/manifest-schema";

import { conversionConfig } from "./conversion-config";
import { decideProductEntry, type ProductEntryDecision } from "./product-entry";

/**
 * Décision d'entrée produit au BORD : le seul endroit qui lit l'environnement et le manifeste épinglé
 * pour l'entrée self-serve (même rôle que `delivery-context.ts` pour les CTA internes).
 */
function decide(intent: "measure" | "sign_in", position: "final" | "contextual" | "header", contentId: string): ProductEntryDecision {
  return decideProductEntry({
    mode: conversionConfig.mode,
    intent,
    gate: selfServeCtaGate(loadPinnedManifest(process.cwd())),
    entryUrl: process.env.PRODUCT_ENTRY_URL,
    contentId,
    position,
  });
}

export function productEntryForHomepage(): ProductEntryDecision {
  return decide("measure", "final", "textos-homepage");
}

/** Même porte, placement en haut de page d'accueil. */
export function productEntryForHero(): ProductEntryDecision {
  return decide("measure", "contextual", "textos-homepage");
}

/** « Sign in » de l'en-tête : vers les espaces existants. N'existe que si l'entrée existe. */
export function productSignInForHeader(): ProductEntryDecision {
  return decide("sign_in", "header", "site-header");
}
