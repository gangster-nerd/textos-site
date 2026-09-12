# Promotion request — `query-intelligence`

- **storyKind**: PRODUCT_CAPABILITY
- **route**: **PRODUCT_MANIFEST_ENTRY_REQUIRED**
- **requiredOwner**: T0
- **requestedPublicMaturity**: PUBLIC_ROADMAP
- **effectivePublicMaturity**: **PRIVATE**
- **manifestCeiling**: PRIVATE
- **disclosureAuthority**: NONE
- **clamped**: true
- **customerDeliverableNow**: false
- **manualEngineeringRequired**: false
- **sourceProductRef**: `a0efa146a8691938b624c156d99f4663f6f92218`

## Blocking reason

Capacité absente du manifeste épinglé. Le plafond est PRIVATE, la maturité proposée (PUBLIC_ROADMAP) est clampée.

## Required next action

Ajouter l'entité "query-intelligence" au manifeste produit (capability-declaration.ts) et réémettre un artefact push/main. Puis ré-import via product-manifest/IMPORT.md.

## Requested manifest change

```
entity query-intelligence publicationStatus ← candidate ou internal_only + intendedPublicState=roadmap (extension schéma)
```

## Implementation evidence
- `src/server/textos/query-intelligence/*`
- `coverage.test.ts declaration_debt`

## Allowed wording

## Prohibited wording
- available
- beta
- buy
- sign up

## Allowed CTAs

- none
