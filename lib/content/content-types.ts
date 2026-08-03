// Littéraux des types de contenu — module MINIMAL, sans dépendance.
//
// Raison d'être : prévention de cycle, pas champ spéculatif. `content-schema.ts` importe les
// valeurs autorisées des registres (cluster, CTA, visuel) ; ces registres ont besoin de la liste
// des contentTypes pour leur `allowedContentTypes`. Les faire importer `ContentFrontmatterSchema`
// fermerait la boucle. Ce fichier est donc la source unique des littéraux, en amont de tous.
//
// Avant, l'union était recopiée à l'identique dans cta-registry.ts et visual-registry.ts : deux
// copies qui pouvaient silencieusement diverger du schéma. Une seule maintenant.

export const CONTENT_TYPES = [
  "developer_note",
  "changelog_entry",
  "faq_entry",
  "product_article",
] as const;

export type ContentTypeName = (typeof CONTENT_TYPES)[number];
