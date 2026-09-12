// Calcul du delta de capacités entre le manifeste ÉPINGLÉ (JSON validé, byte-vérifié) et la
// DÉCLARATION SOURCE TypeScript lue à la ref demandée.
//
// Ce module ne cherche PAS à réexécuter le pipeline de génération du manifeste — cette
// responsabilité reste dans le dépôt produit. Il répond à une question strictement plus faible
// mais suffisante pour le gate `content:sync` :
//
//   Est-ce que la déclaration de capacité au SHA demandé est byte-identique à celle qui a produit
//   le manifeste actuellement épinglé ?
//
// Si oui : le manifeste épinglé s'applique à cette ref, on peut proposer une refresh éditoriale.
// Si non : DECLARATION_DIVERGED, le pipeline exige un ré-import via `gh run download`.
//
// Un ré-import n'appartient PAS à ce module — c'est une action T0 documentée dans IMPORT.md.

import type { ProductManifest } from "@/lib/product-manifest/manifest-schema";

import type { CapabilityDelta, ProductSourceRef } from "./types";

export function computeCapabilityDelta(args: {
  pinnedManifest: ProductManifest;
  targetRef: ProductSourceRef;
}): CapabilityDelta {
  const { targetRef } = args;
  // La comparaison structurelle "ajout/suppression/changement d'entités" n'est réalisable de manière
  // sûre qu'à partir de DEUX manifestes attestés. Nous n'en avons qu'un attesté (l'épinglé). Pour
  // la ref cible, la seule information vérifiable ici est : la déclaration source a-t-elle divergé ?
  //
  // Si oui, on renvoie un delta VIDE mais on lève le drapeau `declarationDiverged`. Le
  // `publishability.ts` traduira ce drapeau en gate rouge, et le bundle mentionnera qu'un
  // ré-import est requis.
  //
  // Si non, delta vide non-divergent = "pas de changement de capacité observable via cette source
  // limitée". Un vrai delta positif exigerait un manifeste attesté à la ref cible.
  return {
    addedEntityIds: [],
    removedEntityIds: [],
    changedEntityIds: [],
    publicationStatusChanges: [],
    declarationDiverged: !targetRef.matchesPinnedManifest,
  };
}
