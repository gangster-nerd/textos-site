---
surface: homepage
truthLevel: AUTHORITATIVE_MAIN
sourceProductRef: a0efa146a8691938b624c156d99f4663f6f92218
classification: NARRATIVE_DRIFT
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

# Homepage — editorial candidate

**Classification** : `NARRATIVE_DRIFT`. Aucune nouvelle capacité GA ; l'arc narratif est
resserré autour des cinq capacités déjà `public_marketable` du manifeste épinglé.

## Proposition d'arc

1. **Problème** — L'autorité de votre marque dans les réponses des modèles n'est pas mesurée.
2. **Mesure** — TextOS observe un panel de requêtes versionné et compose l'autorité en trois
   objets qui restent lisibles : Direct Share of Model, Indirect Mention Share, Total
   Authority Presence.
3. **Preuve** — Chaque mesure porte son Quality Ledger : ce qui a été observé, ce qui manque,
   ce que la mesure ne peut pas dire.
4. **Action** — La voie disponible aujourd'hui est une mesure assistée sur demande. TextOS ne
   revendique aucun raccourci automatique.
5. **Conversion** — Un seul CTA public : `measurement_request` → `/request-measurement`.

## Copy proposée

### Hero

> **Voyez ce que les modèles disent de vous.**
> TextOS mesure la présence d'autorité de votre marque dans les réponses des LLM, sur un panel
> de requêtes versionné et une composition Direct + Indirect + Total.

### Sub-hero

> Aucune promesse de couverture universelle. Aucune valeur simulée présentée comme réelle.
> Chaque mesure porte son ledger : ce qu'on a vu, ce qu'on n'a pas vu, ce qu'on ne peut pas
> dire.

### Trois blocs "how it works"

1. **Panel versionné** — Vous définissez la surface de requêtes ; TextOS versionne la liste
   pour que deux mesures soient comparables.
2. **Composition en trois objets** — Direct Share of Model, Indirect Mention Share, Total
   Authority Presence — jamais mélangés, jamais additionnés hors garde.
3. **Quality Ledger** — Chaque mesure porte les limites de son observation : pas de valeur
   sortie d'un modèle sans provenance.

### CTA (unchanged)

- `measurement_request` — "Request a measurement" → `/request-measurement`

## Termes bannis (rappel copy-safety)

- "detects every mention of the brand"
- "guarantees measurement accuracy"
- "measures every answer a model can produce"
- "tracks brand visibility in real time"
- toute mention d'un CTA self-serve, "trial", "sign up", "start now"
- toute mention de la pipeline interne d'ingénierie éditoriale (surface homepage réservée au produit)

## Base de décision

Le manifeste produit épinglé (`d1b8b50`) est byte-identique au product main
(`a0efa146`) : aucune promotion de capacité n'a eu lieu. Cette copy ne fait donc que
resserrer l'arc autour de ce qui est déjà `public_marketable`. Elle ne propose PAS de nouvelle
capacité, PAS de nouveau CTA, PAS d'activation self-serve.
