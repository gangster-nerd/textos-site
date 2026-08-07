// Registre ÉDITORIAL — ce que CE dépôt déclare des capacités du produit.
// Source de vérité doctrinale : capability-registry.spec.md (§0, §4).
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// MIGRÉ À DEUX AXES (C0A-SITE). L'échelle unique a disparu.
//
// Elle mélangeait deux dimensions : `implemented` décrivait une réalité technique, `forbidden` une
// politique éditoriale. Elles ne sont pas exclusives — `opportunity-brief`, `truth-check` et
// `repos-intersection` sont entièrement implémentées ET non communicables. L'échelle unique rendait
// cet état INEXPRIMABLE : elle imposait de les déclarer `planned` (mensonge sur le code) ou de les
// élever (mensonge sur la politique). Elle avait choisi le premier, et produisait donc trois faux
// écarts permanents contre le manifeste produit.
//
// Ce registre reste une DÉCLARATION PROPRE à ce dépôt, et non une projection du manifeste. C'est ce
// qui permet de confronter deux déclarations indépendantes — et donc de détecter qu'elles divergent.
// Le vérificateur impose une seule direction : le site peut être PLUS RESTRICTIF que le produit,
// jamais plus permissif.
// ─────────────────────────────────────────────────────────────────────────────────────────────

import type {
  ImplementationStatus,
  ManifestEntityKind,
  PublicSurface,
  PublicationStatus,
} from "@/lib/product-manifest/status-axes";

export interface CapabilityDeclaration {
  /**
   * Nature de l'entité, DÉCLARÉE et non déduite. Inférer « concept prohibé » de
   * `implementationStatus === null` confondrait une absence de sens avec une absence de valeur, et
   * empêcherait de détecter qu'un côté traite une entité comme capacité et l'autre comme concept
   * refusé — une incompatibilité ontologique, pas un simple écart de statut.
   */
  kind: ManifestEntityKind;
  /** `null` pour un concept prohibé : une absence de sens, pas une valeur manquante. */
  implementationStatus: ImplementationStatus | null;
  publicationStatus: PublicationStatus;
  /**
   * Surfaces que le SITE revendique. Le gate de contenu autorise une surface si et seulement si
   * elle figure ici — et le vérificateur exige `claimedSurfaces ⊆ allowedSurfaces` du produit.
   */
  claimedSurfaces: readonly PublicSurface[];
  /** Libellé public. Obligatoire dès qu'une surface est revendiquée. */
  label?: string;
}

const EXPLANATORY = ["homepage", "faq", "product_article"] as const;

const DECLARATIONS = {
  "observe-authority-presence": {
    kind: "capability",
    implementationStatus: "implemented",
    publicationStatus: "public_marketable",
    // Seule capacité atteignant la copy commerciale : c'est celle que la copy nomme.
    claimedSurfaces: [...EXPLANATORY, "sales_copy"],
    label: "Authority Presence measurement",
  },
  "direct-share-of-model": {
    kind: "capability",
    implementationStatus: "implemented",
    publicationStatus: "public_marketable",
    claimedSurfaces: EXPLANATORY,
    label: "Direct Share of Model",
  },
  "indirect-mention-share": {
    kind: "capability",
    implementationStatus: "implemented",
    publicationStatus: "public_marketable",
    claimedSurfaces: EXPLANATORY,
    label: "Indirect Mention Share",
  },
  "total-authority-presence": {
    kind: "capability",
    implementationStatus: "implemented",
    publicationStatus: "public_marketable",
    claimedSurfaces: EXPLANATORY,
    label: "Total Authority Presence",
  },
  "quality-ledger": {
    kind: "capability",
    implementationStatus: "implemented",
    publicationStatus: "public_marketable",
    claimedSurfaces: EXPLANATORY,
    label: "Measurement quality ledger",
  },
  "claim-evidence-layer": {
    kind: "capability",
    implementationStatus: "wip_committed_tested",
    publicationStatus: "candidate",
    // FAQ seulement : la seule chose publiable est la délimitation de ce que la couche fait.
    claimedSurfaces: ["faq"],
    label: "Claim Evidence Layer",
  },
  // Implémentées, PAS interdites. Aucune décision n'autorise encore leur communication publique —
  // ce qui n'est pas la même chose qu'une interdiction. L'écart entre les deux axes est VOULU et ne
  // doit pas se lire comme une dette de mise à jour.
  "opportunity-brief": {
    kind: "capability",
    implementationStatus: "implemented",
    publicationStatus: "internal_only",
    claimedSurfaces: [],
  },
  "truth-check": {
    kind: "capability",
    implementationStatus: "implemented",
    publicationStatus: "internal_only",
    claimedSurfaces: [],
  },
  "repos-intersection": {
    kind: "capability",
    implementationStatus: "implemented",
    publicationStatus: "internal_only",
    claimedSurfaces: [],
  },
  "authority-score": {
    kind: "prohibited_concept",
    implementationStatus: null,
    publicationStatus: "forbidden",
    claimedSurfaces: [],
  },
} as const satisfies Record<string, CapabilityDeclaration>;

export type CapabilityId = keyof typeof DECLARATIONS;

/**
 * Vue ÉLARGIE de la déclaration littérale. `as const satisfies` garde les identifiants étroits — ce
 * qu'on veut — mais fige aussi chaque valeur, si bien que les entrées sans libellé n'ont
 * littéralement pas de propriété `label`. Les consommateurs lisent donc le registre à travers ce
 * type uniforme, où `label` est optionnel comme le contrat le dit.
 */
export const CAPABILITY_REGISTRY: Readonly<Record<CapabilityId, CapabilityDeclaration>> =
  DECLARATIONS;

const ALL_IDS = Object.keys(CAPABILITY_REGISTRY) as CapabilityId[];

export function findCapability(id: string): CapabilityDeclaration | undefined {
  return CAPABILITY_REGISTRY[id as CapabilityId];
}

/**
 * Verrou central (spec §0.2) : la marketabilité n'est jamais dérivée d'un état de build. Elle se lit
 * sur l'axe éditorial, et sur lui seul.
 *
 * ATTENTION — insuffisant à lui seul. `public_marketable` dit qu'une capacité PEUT être
 * commercialisée ; il ne dit pas OÙ. Une capacité `public_marketable` restreinte à la FAQ n'a rien
 * à faire en homepage ni dans un CTA. Toute voie de publication doit donc passer par
 * `isMarketableOn` ou `allowsSurface`, jamais par ce prédicat seul.
 */
export const isMarketable = (declaration: CapabilityDeclaration): boolean =>
  declaration.publicationStatus === "public_marketable";

/** La capacité revendique-t-elle cette surface ? Seule règle d'autorisation éditoriale. */
export const allowsSurface = (
  declaration: CapabilityDeclaration,
  surface: PublicSurface
): boolean => declaration.claimedSurfaces.includes(surface);

/**
 * Commercialisable SUR CETTE SURFACE — les deux conditions, jamais une seule.
 *
 * C'est ce qui manquait : le modèle de surfaces ne gouvernait que les gates de contenu, tandis que
 * la homepage, `featureList` et les CTA continuaient de ne lire que le statut. Une capacité
 * `public_marketable` limitée à la FAQ serait apparue en homepage et aurait pu porter un CTA.
 */
export const isMarketableOn = (
  declaration: CapabilityDeclaration,
  surface: PublicSurface
): boolean => isMarketable(declaration) && allowsSurface(declaration, surface);

/**
 * featureList = commercialisable ET revendiqué EN HOMEPAGE (verrou entity-graph §3 / schema-map §4).
 * La surface est explicite : c'est elle que le JSON-LD de la homepage expose.
 */
export const FEATURE_LIST: string[] = ALL_IDS.filter((id) =>
  isMarketableOn(CAPABILITY_REGISTRY[id], "homepage")
).map((id) => CAPABILITY_REGISTRY[id].label ?? id);

// Assertions de garde, au chargement du module (spec §4).
for (const id of ALL_IDS) {
  const declaration: CapabilityDeclaration = CAPABILITY_REGISTRY[id];

  if (isMarketable(declaration) && !declaration.label) {
    throw new Error(`Capacité "${id}" public_marketable sans libellé public.`);
  }
  if (declaration.claimedSurfaces.length > 0 && !declaration.label) {
    throw new Error(`Capacité "${id}" revendique une surface sans libellé public.`);
  }
  // Une surface revendiquée sous un statut qui n'autorise rien serait une contradiction interne :
  // le gate l'accepterait alors que la politique éditoriale l'interdit.
  if (
    declaration.claimedSurfaces.length > 0 &&
    (declaration.publicationStatus === "internal_only" ||
      declaration.publicationStatus === "unsupported" ||
      declaration.publicationStatus === "forbidden")
  ) {
    throw new Error(
      `Capacité "${id}" : publicationStatus "${declaration.publicationStatus}" n'autorise aucune surface, mais ${declaration.claimedSurfaces.length} sont revendiquées.`
    );
  }
}
