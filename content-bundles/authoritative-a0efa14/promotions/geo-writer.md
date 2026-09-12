# Promotion request — `geo-writer`

- **storyKind**: PRODUCT_CAPABILITY
- **route**: **PRODUCT_MANIFEST_ENTRY_REQUIRED**
- **requiredOwner**: T0
- **requestedPublicMaturity**: INTERNAL_LABS
- **effectivePublicMaturity**: **PRIVATE**
- **manifestCeiling**: PRIVATE
- **disclosureAuthority**: NONE
- **clamped**: true
- **customerDeliverableNow**: false
- **manualEngineeringRequired**: true
- **sourceProductRef**: `a0efa146a8691938b624c156d99f4663f6f92218`

## Blocking reason

Capacité absente du manifeste épinglé. Le plafond est PRIVATE, la maturité proposée (INTERNAL_LABS) est clampée.

## Required next action

Ajouter l'entité "geo-writer" au manifeste produit (capability-declaration.ts) et réémettre un artefact push/main. Puis ré-import via product-manifest/IMPORT.md.

## Requested manifest change

```
entity geo-writer publicationStatus ← internal_only + autorité de divulgation CPO_DISCLOSURE_APPROVED côté site
```

## Implementation evidence
- `src/server/textos/act/geo-writer/*`
- `2026-08-24-geo-writer-1 change entry`

## Allowed wording

## Prohibited wording
- available
- beta
- buy
- sign up

## Allowed CTAs

- none
