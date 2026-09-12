---
surface: product_proof
truthLevel: AUTHORITATIVE_MAIN
sourceProductRef: a0efa146a8691938b624c156d99f4663f6f92218
classification: COPY_CLARIFICATION
basisCapabilities:
  - observe-authority-presence
  - direct-share-of-model
  - indirect-mention-share
  - total-authority-presence
  - quality-ledger
disclosureAuthority: IMPLICIT_MANIFEST_MARKETABLE
proposedPublishability: REQUIRES_HUMAN_REVIEW
mentionsCommitToContent: false
---

# Product Proof — editorial candidate

**Classification** : `COPY_CLARIFICATION`. Tighten legends et micro-copy pour rester alignée
sur le vocabulaire réel du produit ; aucune nouvelle capacité, aucune valeur fabriquée.

## Titres de section proposés

1. **De quoi une mesure est faite** — panel versionné + fenêtre d'observation + panel de
   requêtes.
2. **Composition** — Direct Share of Model, Indirect Mention Share, Total Authority Presence
   présentés séparément.
3. **Quality Ledger** — ce qui a été observé, ce qui n'a pas été observé, ce qu'on ne peut
   pas dire.

## Micro-copy proposée (figures documentaires uniquement)

### Under Direct Share of Model

> Proportion des réponses où votre marque apparaît en réponse directe à la requête, sur le
> panel versionné et la fenêtre d'observation retenus.

### Under Indirect Mention Share

> Proportion des réponses où votre marque est mentionnée par un tiers cité dans la réponse.
> Distinct de Direct : jamais additionné, jamais mélangé.

### Under Total Authority Presence

> Composition documentaire de Direct + Indirect selon la règle publiée. Une valeur composite
> n'a de sens qu'accompagnée de ses deux composants.

### Under Quality Ledger

> Toute mesure a des limites. Le ledger dit : combien de réponses ont été collectées, combien
> ont échoué, quelles requêtes du panel n'ont pas produit d'observation. Une non-observation
> n'est jamais un zéro.

## Contrat visuel (rappels)

- Toutes les valeurs affichées restent visuellement documentaires (marquage explicite).
- Aucun run id fabriqué, aucun id client, aucune source simulée présentée comme réelle.
- Les figures conservent leur légende "example / illustrative" en clair.

## Termes bannis

- "real customer result"
- "live data"
- "measured X% for brand Y" — sauf provenance publique attestée
- "predicts your share of voice" (l'observation n'est pas une prédiction)

## Base de décision

Le grammaire produit R2 (`3cfae583`) introduit des read-models internes (MeasurementsViewModel
S-B, AuthorityPresenceDisplay S-C) mais AUCUN de ces artefacts n'entre dans le manifeste
autoritatif. Cette copy reste donc strictement dans la grammaire déjà publique.
