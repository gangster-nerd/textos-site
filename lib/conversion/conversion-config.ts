// Mode de conversion — gouverne la LIVRAISON, jamais la proposition commerciale.
//
// Séparation des responsabilités, à ne pas mélanger :
//   cta-registry      → la copy, les claims, la destination. Ce que l'on promet.
//   conversion-config → ce qu'il advient d'une soumission. Comment on la traite.
//
// Le registre CTA ne connaît ni Vercel, ni le fournisseur, ni l'environnement. Conséquence
// directe : la bascule démo → production est un changement de CONFIGURATION, pas de contenu.
// Aucun Markdown, aucune copy, aucun composant ne change entre les deux.

/** `off` = rien de visible · `demo` = parcours complet, soumission simulée · `live` = collecte réelle. */
export type ConversionMode = "off" | "demo" | "live";

const MODES: readonly ConversionMode[] = ["off", "demo", "live"];

/**
 * Variables exigées en mode `live`. Leur absence fait ÉCHOUER LE BUILD : le mode live ne peut donc
 * jamais être activé accidentellement avec des informations juridiques incomplètes. Collecter sans
 * pouvoir informer serait une faute, pas un défaut de configuration.
 */
export const LIVE_REQUIRED_ENV = [
  "MEASUREMENT_FORM_ENDPOINT",
  "LEGAL_CONTROLLER_NAME",
  "LEGAL_CONTROLLER_ADDRESS",
  "PRIVACY_CONTACT_EMAIL",
  "DATA_RETENTION_PERIOD",
  "FORM_PROVIDER_NAME",
] as const;

const raw = process.env.CONVERSION_MODE ?? "off";
if (!MODES.includes(raw as ConversionMode)) {
  throw new Error(
    `CONVERSION_MODE invalide : « ${raw} ». Valeurs admises : ${MODES.join(", ")}.`
  );
}
const mode = raw as ConversionMode;

const missing = LIVE_REQUIRED_ENV.filter((key) => !process.env[key]?.trim());
if (mode === "live" && missing.length > 0) {
  throw new Error(
    `CONVERSION_MODE=live sans ${missing.join(", ")}. ` +
      `Aucune collecte réelle sans endpoint, responsable de traitement, adresse, contact des ` +
      `droits, durée de conservation et sous-traitant nommé.`
  );
}

export interface LegalNotice {
  controllerName: string;
  controllerAddress: string;
  privacyContactEmail: string;
  dataRetentionPeriod: string;
  formProviderName: string;
}

export const conversionConfig = {
  mode,
  isOff: mode === "off",
  isDemo: mode === "demo",
  isLive: mode === "live",
  /** Endpoint du sous-traitant — renseigné en `live` seulement. `null` partout ailleurs. */
  formEndpoint: mode === "live" ? (process.env.MEASUREMENT_FORM_ENDPOINT as string) : null,
  /** Mentions légales publiables : vrai uniquement quand toutes les valeurs existent. */
  legalNoticePublished: missing.length === 0,
  /**
   * Contenu réel des mentions légales — même garde que `legalNoticePublished`, mais sous forme
   * consommable par `/privacy`. `null` tant qu'une seule valeur manque : la page ne doit jamais
   * afficher un champ vide comme s'il avait été renseigné.
   */
  legalNotice:
    missing.length === 0
      ? ({
          controllerName: process.env.LEGAL_CONTROLLER_NAME as string,
          controllerAddress: process.env.LEGAL_CONTROLLER_ADDRESS as string,
          privacyContactEmail: process.env.PRIVACY_CONTACT_EMAIL as string,
          dataRetentionPeriod: process.env.DATA_RETENTION_PERIOD as string,
          formProviderName: process.env.FORM_PROVIDER_NAME as string,
        } satisfies LegalNotice)
      : null,
} as const;
