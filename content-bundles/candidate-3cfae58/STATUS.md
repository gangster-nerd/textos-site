# candidate-3cfae58

- **truthLevel**: CANDIDATE
- **sourceProductRef**: `3cfae5830fed3f10fd35ed77e699a183162b6cbe`
- **pinnedManifestSha**: `d1b8b50552e1b42768a6bd0c0515675e139780d3`
- **matchesPinnedManifest**: true
- **overallStatus**: **WAITING_FOR_PRODUCT_MAIN**
- **overallReason**: Source CANDIDATE (R2 non intégré à main). Bundle préparé et vérifié ; publication conditionnée à l'intégration produit main.

## Gates
- `manifestDrift`: **green** — La ref demandée est byte-identique au manifeste épinglé.
- `declarationIntegrity`: **green** — Digest de la déclaration source conforme à l'épinglé.
- `truthLevelGate`: **green** — Source CANDIDATE — bundle préparé pour déblocage futur, non publiable en l'état.
- `selfServeCtaGate`: **green** — 3 capacité(s) self-serve reste(nt) internal_only (truth-check, grounded-truth-check, structured-generation). Le pipeline ne propose PAS d'activation publique.

## Surfaces
- `homepage` → **WAITING_FOR_PRODUCT_MAIN** — Source CANDIDATE — squelette candidat émis, publication conditionnée à l'intégration produit main.
- `product_proof` → **WAITING_FOR_PRODUCT_MAIN** — Source CANDIDATE — squelette candidat émis, publication conditionnée à l'intégration produit main.
- `faq` → **WAITING_FOR_PRODUCT_MAIN** — Source CANDIDATE — squelette candidat émis, publication conditionnée à l'intégration produit main.
- `methodology` → **WAITING_FOR_PRODUCT_MAIN** — Source CANDIDATE — squelette candidat émis, publication conditionnée à l'intégration produit main.

## Capability delta
- added: ∅
- removed: ∅
- changed: ∅
- declarationDiverged: false

