// Vocabulaire à DEUX AXES — partagé avec le manifeste de vérité produit.
//
// Le registre de ce dépôt utilisait une échelle unique où `implemented` décrivait une réalité
// technique et `forbidden` une politique éditoriale. Les deux ne sont pas exclusives : une capacité
// peut être entièrement implémentée ET non communicable. L'échelle unique rendait cet état
// inexprimable, et forçait à mentir soit sur le code, soit sur la politique. Elle a disparu.
//
// DUPLICATION ASSUMÉE : ces littéraux existent aussi dans `textos-v0/src/manifest`. Les deux dépôts
// n'ont pas de paquet partagé, et en créer un pour quelques littéraux coûterait plus cher que la
// duplication. `statusVocabularyVersion`, contrôlé au chargement, la protège : un manifeste portant
// une version inconnue est REFUSÉ, jamais interprété partiellement.

export const IMPLEMENTATION_STATUSES = [
  "planned",
  "implemented_schema_only",
  "wip_committed_tested",
  "implemented",
] as const;

export const PUBLICATION_STATUSES = [
  "internal_only",
  "candidate",
  "public_marketable",
  "risky",
  "unsupported",
  "forbidden",
] as const;

export const PUBLIC_SURFACES = [
  "developer_note",
  "changelog",
  "faq",
  "product_article",
  "homepage",
  "pricing",
  "sales_copy",
] as const;

export const ENTITY_KINDS = ["capability", "prohibited_concept"] as const;

export type ImplementationStatus = (typeof IMPLEMENTATION_STATUSES)[number];
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];
export type PublicSurface = (typeof PUBLIC_SURFACES)[number];
export type ManifestEntityKind = (typeof ENTITY_KINDS)[number];

export const SUPPORTED_SCHEMA_VERSION = 2;
export const SUPPORTED_VOCABULARY_VERSION = 3;

/**
 * Avancement technique — ordre total, il décrit une progression réelle. Sert UNIQUEMENT à détecter
 * qu'un côté suppose plus d'avancement que l'autre ; il ne décide d'aucune autorisation.
 */
const IMPLEMENTATION_RANK: Record<ImplementationStatus, number> = {
  planned: 0,
  implemented_schema_only: 1,
  wip_committed_tested: 2,
  implemented: 3,
};

export function implementationRank(status: ImplementationStatus): number {
  return IMPLEMENTATION_RANK[status];
}

/**
 * Ce qui est AUTORISÉ se lit dans les surfaces, jamais dans un rang.
 *
 * `internal_only`, `unsupported` et `forbidden` interdisent tous les trois toute surface, pour des
 * raisons radicalement différentes — « aucune décision prise », « ne doit pas être présenté comme
 * supporté », « interdiction arbitrée ». Un classement les écraserait l'une sur l'autre.
 */
export const AUTHORIZES_NOTHING: ReadonlySet<PublicationStatus> = new Set<PublicationStatus>([
  "internal_only",
  "unsupported",
  "forbidden",
]);
