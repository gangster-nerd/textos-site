// CMO-CONVERSION-SURFACE-2 — newsletter retention config.
//
// Décision CPO du 27/10/2026 : la newsletter est gérée dans le PLG du produit TextOS
// (contrat PLG Lifecycle Email V1 : « newsletter / marketing consent » reporté, et toute extension
// « must consume this outbox/event truth rather than bypass it »). Le site ne branche donc aucun
// fournisseur et ne collecte aucune adresse : comme pour l'entrée produit (ENTRY-1), il ne possède
// que l'appel et le lien de passage ; le produit possède l'identité, le consentement et l'envoi.
//
// Tant que le lot PLG « consentement marketing » n'expose pas de route d'inscription, `handoffUrl`
// vaut `null` : le bloc reste non soumissible (visible désactivé en preview seulement).

export type NewsletterProvider = "textos_plg";

export interface NewsletterConfig {
  provider: NewsletterProvider;
  /** Passage vers l'inscription produit. `null` → aucune soumission possible. */
  handoffUrl: string | null;
  /** Tag surfaced through governed attributes. */
  sourceTag: string;
  /** Surface version this adapter is bound to (for governance / analytics). */
  surfaceVersion: string;
}

export const newsletterConfig: NewsletterConfig = {
  provider: "textos_plg",
  handoffUrl: null,
  sourceTag: "textos-insights",
  surfaceVersion: "reference@3",
};

export function newsletterProviderState(cfg: NewsletterConfig): "configured" | "unconfigured" {
  return cfg.handoffUrl ? "configured" : "unconfigured";
}
