# Promotion request — `wordpress-publication`

- **storyKind**: PRODUCT_CAPABILITY
- **route**: **PRODUCT_MANIFEST_ENTRY_REQUIRED**
- **requiredOwner**: T0
- **requestedPublicMaturity**: PUBLIC_BETA
- **effectivePublicMaturity**: **PRIVATE**
- **manifestCeiling**: PRIVATE
- **disclosureAuthority**: NONE
- **clamped**: true
- **customerDeliverableNow**: true
- **manualEngineeringRequired**: true
- **sourceProductRef**: `3cfae5830fed3f10fd35ed77e699a183162b6cbe`

## Blocking reason

Capacité absente du manifeste épinglé. Le plafond est PRIVATE, la maturité proposée (PUBLIC_BETA) est clampée.

## Required next action

Ajouter l'entité "wordpress-publication" au manifeste produit (capability-declaration.ts) et réémettre un artefact push/main. Puis ré-import via product-manifest/IMPORT.md.

## Requested manifest change

```
entity wordpress-publication publicationStatus ← candidate (le vocabulaire manifeste v2 n'a pas encore d'état beta/early_access ; à trancher par T0)
```

## Implementation evidence
- `src/server/textos/act/providers/wordpress/index.ts`
- `src/server/textos/act/publication.ts`
- `ADR-016 (S12 graduated publication)`

## Allowed wording

## Prohibited wording
- one-click publishing
- auto-publish
- GA-level reliability
- production-scale SLA

## Allowed CTAs

- none
