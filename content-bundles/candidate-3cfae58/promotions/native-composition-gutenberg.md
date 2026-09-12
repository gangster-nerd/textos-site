# Promotion request — `native-composition-gutenberg`

- **storyKind**: PRODUCT_CAPABILITY
- **route**: **PRODUCT_MANIFEST_ENTRY_REQUIRED**
- **requiredOwner**: T0
- **requestedPublicMaturity**: PUBLIC_EARLY_ACCESS
- **effectivePublicMaturity**: **PRIVATE**
- **manifestCeiling**: PRIVATE
- **disclosureAuthority**: NONE
- **clamped**: true
- **customerDeliverableNow**: false
- **manualEngineeringRequired**: true
- **sourceProductRef**: `3cfae5830fed3f10fd35ed77e699a183162b6cbe`

## Blocking reason

Capacité absente du manifeste épinglé. Le plafond est PRIVATE, la maturité proposée (PUBLIC_EARLY_ACCESS) est clampée.

## Required next action

Ajouter l'entité "native-composition-gutenberg" au manifeste produit (capability-declaration.ts) et réémettre un artefact push/main. Puis ré-import via product-manifest/IMPORT.md.

## Requested manifest change

```
entity native-composition-gutenberg publicationStatus ← candidate (le vocabulaire manifeste v2 n'a pas encore d'état beta/early_access ; à trancher par T0)
```

## Implementation evidence
- `src/server/textos/act/native-composition/gutenberg-serializer.ts`
- `src/server/textos/act/native-composition/gutenberg-vocabulary.ts`
- `gutenberg-parity tests`

## Allowed wording

## Prohibited wording
- universal composer compatibility
- self-service integration
- supports every WordPress theme

## Allowed CTAs

- none
