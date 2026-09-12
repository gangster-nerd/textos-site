# Promotion request — `asset-spec`

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
- **sourceProductRef**: `3cfae5830fed3f10fd35ed77e699a183162b6cbe`

## Blocking reason

Capacité absente du manifeste épinglé. Le plafond est PRIVATE, la maturité proposée (INTERNAL_LABS) est clampée.

## Required next action

Ajouter l'entité "asset-spec" au manifeste produit (capability-declaration.ts) et réémettre un artefact push/main. Puis ré-import via product-manifest/IMPORT.md.

## Requested manifest change

```
entity asset-spec publicationStatus ← internal_only + autorité de divulgation CPO_DISCLOSURE_APPROVED côté site
```

## Implementation evidence
- `src/server/textos/act/asset-spec/*`
- `ADR-021`
- `2026-08-25-asset-spec-2 change entry`

## Allowed wording

## Prohibited wording
- available
- beta
- buy
- sign up

## Allowed CTAs

- none
