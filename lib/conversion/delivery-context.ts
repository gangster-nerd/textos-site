import { existsSync } from "node:fs";
import path from "node:path";

import { conversionConfig } from "./conversion-config";
import type { CtaDeliveryContext } from "./cta-resolver";

/**
 * Contexte de livraison réel — le seul endroit qui touche l'environnement et le filesystem.
 *
 * Il vivait en privé dans `content-gates`, où seuls les documents pouvaient l'atteindre. La page
 * d'accueil porte désormais la même proposition commerciale et doit être soumise EXACTEMENT aux
 * mêmes contrôles : route réelle, endpoint configuré, mentions légales publiées. D'où un module
 * partagé — et non un second contexte pour la homepage.
 *
 * Le remonter ici plutôt que de le recopier évite la dérive qui aurait suivi — deux contextes,
 * l'un vérifiant l'existence de la route et l'autre l'oubliant, sans que rien ne le signale.
 */
export function deliveryContext(): CtaDeliveryContext {
  return {
    mode: conversionConfig.mode,
    routeExists: (route) =>
      existsSync(path.join(process.cwd(), "app", ...route.split("/").filter(Boolean), "page.tsx")),
    endpointConfigured: conversionConfig.formEndpoint !== null,
    legalNoticePublished: conversionConfig.legalNoticePublished,
  };
}
