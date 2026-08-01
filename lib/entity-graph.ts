// Construction du JSON-LD de la homepage, au strict minimum requis par la page.
// Source de vérité doctrinale : entity-graph.spec.md (§1, §3), schema-map.spec.md (§1, §4, §5).

import { FEATURE_LIST } from "./capability-registry";
import { siteConfig } from "./config/site";

type JsonLd = Record<string, unknown>;

export function buildHomepageJsonLd(): JsonLd[] {
  // Origine provisoire (allowIndexing=false) : pas d'url absolue dans le JSON-LD.
  // Une valeur inconnue se déclare absente, jamais fausse (localhost / URL qui 404).
  // S'auto-rétablit dès qu'une origine réelle et indexable est tranchée.
  const originUrl: JsonLd = siteConfig.allowIndexing ? { url: siteConfig.origin } : {};

  const organization: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "TextOS",
    ...originUrl,
    description:
      "TextOS is an Authority Intelligence System: it measures how AI answer engines cite a brand, reproducibly and defensibly.",
    // sameAs : réels et vérifiables uniquement (schema-map §5). Aucun placeholder → absent tant qu'aucun profil vérifié.
  };

  const website: JsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "TextOS",
    ...originUrl,
    inLanguage: "en",
  };

  const softwareApplication: JsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "TextOS",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Measure authority presence in AI answer engines with reproducible, dispersion-aware metrics.",
    // Verrou : featureList = capacités public_marketable uniquement.
    featureList: FEATURE_LIST,
  };

  return [organization, website, softwareApplication];
}
