# content-bundles

Sortie versionnée du pipeline **commit-to-content V1**. Chaque sous-répertoire est un bundle produit par `pnpm content:sync --product-ref <sha>`.

## Structure

```
content-bundles/
  authoritative-<sha7>/    # truthLevel = AUTHORITATIVE_MAIN
  candidate-<sha7>/        # truthLevel = CANDIDATE  (jamais publiable en l'état)
```

Chaque bundle contient :

- `bundle.json` — sérialisation machine complète (source, delta, publishability, gates).
- `provenance.json` — source ref, digest, SHA du manifeste épinglé, tête du site.
- `publishability.json` — décision agrégée + décisions par surface + gates.
- `STATUS.md` — vue humaine.
- `candidates/<surface>.md` — squelettes déterministes à compléter par l'opérateur.

## Invariants

1. `truthLevel=CANDIDATE` ⇒ `overallStatus ∈ {WAITING_FOR_PRODUCT_MAIN, BLOCKED}`. Jamais `PUBLIC_SAFE`.
2. Divergence entre la déclaration source à la ref cible et le manifeste épinglé ⇒ `overallStatus=BLOCKED`. Le pipeline exige un ré-import via `gh run download` (voir `product-manifest/IMPORT.md`).
3. Aucune capacité `internal_only` du manifeste ne peut être marketée sur une surface publique — le gate `selfServeCtaGate` empêche toute proposition d'activation self-serve tant que la capacité n'est pas `public_marketable`.

## Ne PAS

- Éditer manuellement `bundle.json` ou `publishability.json` — ces fichiers sont regénérés par `content:sync`.
- Faire tourner `content:sync` en CI. Il exige l'accès à un clone local de `textos-v0`.
- Marquer un bundle CANDIDATE comme PUBLIC_SAFE, quel que soit le résultat des autres gates.
