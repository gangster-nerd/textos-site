// MEASUREMENT-REQUEST-CAPTURE-1 — capacité de capture de la demande de mesure, vue par la
// surface article (porte stricte du plan de conversion, voir conversion-plan.ts).
//
// Portage PR #22 sur la gouvernance de conversion de main (Merge #24) : cette capacité n'est
// plus une configuration propre codée en dur (endpoint, responsable de traitement, contact). Elle
// est DÉRIVÉE de `conversionConfig`, seule source de vérité de la livraison :
//   - `off`  → `unconfigured` : aucune capture, aucun CTA commercial.
//   - `demo` → `configured`   : parcours complet, soumission simulée (rien n'est transmis).
//   - `live` → `configured` seulement si l'endpoint ET les mentions légales existent ; le build
//              échoue déjà sinon (conversion-config), ceci n'est que le filet de sécurité.
// Aucune identité, adresse ou endpoint n'est écrit ici : en `live`, tout vient de la
// configuration de déploiement ; ailleurs, ces champs valent `null`.

import { conversionConfig } from "@/lib/conversion/conversion-config";

export type MeasurementRequestState = "configured" | "unconfigured";

export interface MeasurementRequestCapability {
  state: MeasurementRequestState;
  /** Endpoint du sous-traitant — `null` hors `live`. */
  endpoint: string | null;
  /** Responsable de traitement publié — `null` tant que les mentions légales ne le sont pas. */
  controllerName: string | null;
  /** Contact des droits publié — `null` tant que les mentions légales ne le sont pas. */
  privacyContactEmail: string | null;
  privacyUrl: "/privacy";
}

type ConversionConfigView = Pick<
  typeof conversionConfig,
  "mode" | "formEndpoint" | "legalNotice"
>;

export function resolveMeasurementRequestCapability(
  cfg: ConversionConfigView = conversionConfig,
): MeasurementRequestCapability {
  const legal = cfg.legalNotice;
  const configured =
    cfg.mode === "demo" ||
    (cfg.mode === "live" && Boolean(cfg.formEndpoint) && legal !== null);
  return {
    state: configured ? "configured" : "unconfigured",
    endpoint: cfg.mode === "live" ? cfg.formEndpoint : null,
    controllerName: legal?.controllerName ?? null,
    privacyContactEmail: legal?.privacyContactEmail ?? null,
    privacyUrl: "/privacy",
  };
}

export const measurementRequestCapability: MeasurementRequestCapability =
  resolveMeasurementRequestCapability();
