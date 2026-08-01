// Construction du JSON-LD de la homepage, au strict minimum requis par la page.
// Source de vérité doctrinale : entity-graph.spec.md (§1, §3), schema-map.spec.md (§1, §4, §5).

import { FEATURE_LIST } from "./capability-registry";
import { siteConfig } from "./config/site";

const SITE_URL = siteConfig.origin;

type JsonLd = Record<string, unknown>;

export function buildHomepageJsonLd(): JsonLd[] {
  const organization: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "TextOS",
    url: SITE_URL,
    description:
      "TextOS is an Authority Intelligence System: it measures how AI answer engines cite a brand, reproducibly and defensibly.",
    // sameAs : réels et vérifiables uniquement (schema-map §5). Aucun placeholder → absent tant qu'aucun profil vérifié.
  };

  const website: JsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "TextOS",
    url: SITE_URL,
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
