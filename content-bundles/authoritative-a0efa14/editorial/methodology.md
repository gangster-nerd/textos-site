---
surface: methodology
truthLevel: AUTHORITATIVE_MAIN
sourceProductRef: a0efa146a8691938b624c156d99f4663f6f92218
classification: NO_CHANGE
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

# Methodology — editorial candidate

**Classification** : `NO_CHANGE`. Documentation honnête : la couverture méthodologique
courante est adéquate ; aucune modification n'est proposée.

## Couverture actuelle (inspectée)

Quatre articles methodology existent déjà et documentent chacune des capacités autoritatives :

- `authority-presence` — présentation générale de la mesure.
- `direct-indirect-total` — composition de l'autorité.
- `measurement-quality-ledger` — le ledger de qualité.
- `not-observable-is-not-zero` — l'absence d'observation ≠ un zéro.

## Pourquoi NO_CHANGE

1. Le manifeste produit épinglé (`d1b8b50`) est byte-identique au product main (`a0efa146`) :
   aucune capacité publique n'a été promue ni ajoutée.
2. Chaque capacité autoritative est déjà couverte par un article methodology dédié.
3. La grammaire produite par les commits R2 (S-B/S-C/S-F/S-G/QI-ACTIVATION-PA) reste
   `internal_only` : elle ne peut pas alimenter une nouvelle article methodology publique.
4. Introduire une modification sans base de manifeste violerait la règle : "Do not manufacture
   a change where NO_CHANGE is supported."

## Ce qui déclencherait un update

Une promotion produit :

- une nouvelle capacité `public_marketable` au manifeste (via `gh run download` + ré-import
  documenté dans `product-manifest/IMPORT.md`) ;
- ou une clarification doctrinale ADR sur une capacité déjà publique qui rendrait un article
  existant obsolète.

Aucun de ces événements n'est présent à `a0efa146`.

## Rappel

Cette candidate honnête sert de trace : le pipeline commit-to-content est capable d'émettre
`NO_CHANGE` avec justification, sans manufacturer du contenu pour remplir la surface.
