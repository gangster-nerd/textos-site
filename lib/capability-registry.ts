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
  PublicSurface,
  PublicationStatus,
} from "@/lib/product-manifest/status-axes";

export interface CapabilityDeclaration {
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
    implementationStatus: "implemented",
    publicationStatus: "public_marketable",
    // Seule capacité atteignant la copy commerciale : c'est celle que la copy nomme.
    claimedSurfaces: [...EXPLANATORY, "sales_copy"],
    label: "Authority Presence measurement",
  },
  "direct-share-of-model": {
    implementationStatus: "implemented",
    publicationStatus: "public_marketable",
    claimedSurfaces: EXPLANATORY,
    label: "Direct Share of Model",
  },
  "indirect-mention-share": {
    implementationStatus: "implemented",
    publicationStatus: "public_marketable",
    claimedSurfaces: EXPLANATORY,
    label: "Indirect Mention Share",
  },
  "total-authority-presence": {
    implementationStatus: "implemented",
    publicationStatus: "public_marketable",
    claimedSurfaces: EXPLANATORY,
    label: "Total Authority Presence",
  },
  "quality-ledger": {
    implementationStatus: "implemented",
    publicationStatus: "public_marketable",
    claimedSurfaces: EXPLANATORY,
    label: "Measurement quality ledger",
  },
  "claim-evidence-layer": {
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
    implementationStatus: "implemented",
    publicationStatus: "internal_only",
    claimedSurfaces: [],
  },
  "truth-check": {
    implementationStatus: "implemented",
    publicationStatus: "internal_only",
    claimedSurfaces: [],
  },
  "repos-intersection": {
    implementationStatus: "implemented",
    publicationStatus: "internal_only",
    claimedSurfaces: [],
  },
  "authority-score": {
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
 */
export const isMarketable = (declaration: CapabilityDeclaration): boolean =>
  declaration.publicationStatus === "public_marketable";

/** featureList = uniquement public_marketable (verrou entity-graph §3 / schema-map §4). */
export const FEATURE_LIST: string[] = ALL_IDS.filter((id) =>
  isMarketable(CAPABILITY_REGISTRY[id])
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
