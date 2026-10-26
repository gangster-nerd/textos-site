import { CTA_ATTRIBUTION_ALLOWED_KEYS } from "@/lib/content-surface-engine/conversion/build-cta-attribution";
import { getCtaVariant } from "./cta-registry";

/**
 * Attribution d'ARRIVÉE sur `/request-measurement` — le pendant, côté formulaire, de
 * `buildCtaAttributionHref`.
 *
 * Les CTA des articles ajoutent à leur destination une attribution à liste blanche stricte (source,
 * contentId, clusterId, ctaVariant, ctaVersion, position, contentRevision). Jusqu'ici le formulaire
 * l'ignorait : une demande de mesure ne pouvait pas être rattachée à l'article qui l'avait produite,
 * et la boucle PLG (contenu → demande → mesure) restait aveugle sur son premier maillon.
 *
 * Règles :
 *   - pure et sans effet : lecture d'une chaîne de requête, jamais de stockage ni de réseau ;
 *   - tout ou rien : une seule valeur hors contrat (source étrangère, variante inconnue, format
 *     inattendu) et l'attribution entière est ignorée — jamais de rattachement partiel ou forgé ;
 *   - seules les clés de la liste blanche sont lues ; toute autre clé est ignorée ;
 *   - aucune donnée personnelle : des identifiants techniques de contenu et de variante.
 */
export interface LandingAttribution {
  contentId: string;
  clusterId: string | null;
  ctaVariant: string;
  ctaVersion: string;
  position: "contextual" | "final" | "header";
  contentRevision: string;
}

/** Noms des champs cachés transmis avec la soumission (et seulement eux). */
export const LANDING_ATTRIBUTION_FIELDS = {
  contentId: "source_content_id",
  clusterId: "source_cluster_id",
  ctaVariant: "source_cta_variant",
  ctaVersion: "source_cta_version",
  position: "source_position",
  contentRevision: "source_content_revision",
} as const satisfies Record<keyof LandingAttribution, string>;

const SLUG = /^[a-z0-9][a-z0-9-]{0,119}$/;
const INTEGER = /^(0|[1-9][0-9]{0,5})$/;
const POSITIONS = new Set(["contextual", "final", "header"]);

export function parseLandingAttribution(search: string): LandingAttribution | null {
  const params = new URLSearchParams(search);
  const read = (key: (typeof CTA_ATTRIBUTION_ALLOWED_KEYS)[number]) => params.get(key);

  if (read("source") !== "textos-site") return null;
  const contentId = read("contentId");
  const clusterId = read("clusterId");
  const ctaVariant = read("ctaVariant");
  const ctaVersion = read("ctaVersion");
  const position = read("position");
  const contentRevision = read("contentRevision");

  if (contentId === null || !SLUG.test(contentId)) return null;
  if (clusterId !== null && !SLUG.test(clusterId)) return null;
  if (ctaVariant === null || getCtaVariant(ctaVariant)?.status !== "approved") return null;
  if (ctaVersion === null || !INTEGER.test(ctaVersion)) return null;
  if (position === null || !POSITIONS.has(position)) return null;
  if (contentRevision === null || !INTEGER.test(contentRevision)) return null;

  return {
    contentId,
    clusterId,
    ctaVariant,
    ctaVersion,
    position: position as LandingAttribution["position"],
    contentRevision,
  };
}
