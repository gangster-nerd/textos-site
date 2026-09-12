---
surface: faq
truthLevel: AUTHORITATIVE_MAIN
sourceProductRef: a0efa146a8691938b624c156d99f4663f6f92218
classification: CONTENT_COVERAGE_GAP
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

# FAQ — editorial candidate

**Classification** : `CONTENT_COVERAGE_GAP`. Une seule entrée FAQ existe actuellement
(`does-textos-automatically-verify-claims`). Deux nouvelles entrées sont proposées pour
répondre à des questions récurrentes — toutes dans les bornes autoritatives.

## Entrée 1 (existante — à conserver telle quelle)

`does-textos-automatically-verify-claims` — statue déjà que TextOS ne vérifie pas
automatiquement les claims, ce qui reste juste : truth-check demeure `internal_only`.

## Entrée 2 (proposée — nouveau)

### Slug
`what-is-the-difference-between-direct-and-indirect-share`

### Titre
> What is the difference between Direct Share of Model and Indirect Mention Share?

### Corps proposé
> Direct Share of Model measures the proportion of model responses that name your brand as a
> direct answer to the query. Indirect Mention Share measures the proportion where your brand
> is mentioned by a third party that the model cited. TextOS reports them separately and
> never adds them: the two describe different observations. The Total Authority Presence
> figure exposes a documented composition rule, and is only meaningful when read alongside
> its two components.
>
> There is no single "brand visibility" number. Any composite you see in TextOS carries the
> composition rule and both underlying values.

Basis: `direct-share-of-model`, `indirect-mention-share`, `total-authority-presence` (all
`public_marketable`).

## Entrée 3 (proposée — nouveau)

### Slug
`what-does-the-quality-ledger-tell-me`

### Titre
> What does the Quality Ledger tell me about a measurement?

### Corps proposé
> Every TextOS measurement carries a Quality Ledger. It reports what was observed, what
> failed to observe, and which queries in the panel returned no data. A missing observation
> is not treated as zero: absence of evidence is not evidence of absence. If a query returned
> no response, the ledger says so, and the composed values acknowledge the missing bucket
> rather than silently rounding it in.

Basis: `quality-ledger` (`public_marketable`).

## Termes bannis

- "TextOS verifies claims for you" (contradit truth-check internal_only)
- "TextOS publishes verified content" (contradit ADR-016 graduated publication)
- "TextOS predicts your revenue"
- toute mention de la pipeline interne d'ingénierie éditoriale en surface FAQ visiteur

## Base de décision

Ces trois entrées reposent exclusivement sur des capacités `public_marketable`. Aucune ne
parle de truth-check, opportunity-brief, native composition ou WordPress publication — toutes
restent internal_only ou absentes du manifeste.
