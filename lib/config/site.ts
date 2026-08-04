import { z } from "zod";

const SiteOriginSchema = z.string().url();

/**
 * Origine du déploiement, par ordre de priorité :
 *   1. `SITE_ORIGIN` — valeur GOUVERNÉE, posée explicitement (production, développement).
 *   2. `VERCEL_URL` — origine RÉELLE du déploiement courant, exposée par la plateforme. Sert les
 *      Preview Deployments : sans elle, une preview croirait tourner sur localhost alors qu'elle
 *      est servie sur `*.vercel.app`. Le défaut était sûr, mais il mentait.
 *   3. `localhost` — dernier recours, développement local hors plateforme.
 *
 * Requiert que l'exposition automatique des variables système soit active dans les réglages du
 * projet Vercel (`autoExposeSystemEnvs`), sans quoi `VERCEL_URL` est absente et l'on retombe sur
 * localhost — dégradé, jamais dangereux : localhost est provisoire.
 */
const vercelDeploymentOrigin = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : undefined;

const raw = process.env.SITE_ORIGIN ?? vercelDeploymentOrigin ?? "http://localhost:3000";
const origin = SiteOriginSchema.parse(new URL(raw).origin);

/**
 * Défense SECONDAIRE : origines de plateforme connues, jamais autoritatives. Utile — elle attrape
 * les erreurs probables — mais ce n'est PAS l'autorité : une plateforme nouvelle, un sous-domaine
 * temporaire ou une URL mal renseignée n'y figureraient pas. L'autorité est l'approbation
 * explicite ci-dessous.
 */
const PROVISIONAL_ORIGIN =
  /localhost|127\.0\.0\.1|placeholder|example\.|github\.io|vercel\.app|netlify\.app|pages\.dev|onrender\.com|fly\.dev/i;

const isProvisional = PROVISIONAL_ORIGIN.test(origin);

/**
 * AUTORISATION POSITIVE de l'origine publique. `false` par défaut, et par défaut absolu : une
 * origine n'est jamais publique par déduction, elle le devient par approbation explicite.
 *
 * Ne sera posée à `true` que pendant D0B/S4, après validation humaine du domaine détenu.
 */
const isPublicOriginApproved = process.env.PUBLIC_ORIGIN_APPROVED === "true";

/** Bascule d'indexation — décision DISTINCTE de l'approbation d'origine. */
const isIndexableBuild = process.env.PUBLIC_INDEXABLE_BUILD === "true";

// ── Le double verrou. Trois conditions simultanées, aucune implicite. ────────────────────────
const allowIndexing = isIndexableBuild && isPublicOriginApproved && !isProvisional;

// Une origine reconnue provisoire ne peut pas être approuvée : l'approbation porterait sur une
// adresse qui ne nous appartient pas et qui changera.
if (isPublicOriginApproved && isProvisional) {
  throw new Error(
    `PUBLIC_ORIGIN_APPROVED=true sur une origine provisoire (${origin}). ` +
      `Une origine de plateforme ou locale ne peut pas être approuvée comme origine publique.`
  );
}

// Un build indexable exige une origine approuvée. Sans cette règle, une origine simplement
// inconnue de la liste des plateformes suffirait à publier — c'est exactement le trou que
// l'approbation positive ferme.
if (isIndexableBuild && !isPublicOriginApproved) {
  throw new Error(
    `PUBLIC_INDEXABLE_BUILD=true sans PUBLIC_ORIGIN_APPROVED=true (origine ${origin}). ` +
      `L'indexation exige DEUX décisions explicites : origine approuvée, puis build indexable.`
  );
}

export const siteConfig = {
  origin,
  isProvisional,
  isPublicOriginApproved,
  isIndexableBuild,
  allowIndexing,
} as const;
