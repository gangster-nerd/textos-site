# authoritative-a0efa14

- **truthLevel**: AUTHORITATIVE_MAIN
- **sourceProductRef**: `a0efa146a8691938b624c156d99f4663f6f92218`
- **pinnedManifestSha**: `d1b8b50552e1b42768a6bd0c0515675e139780d3`
- **matchesPinnedManifest**: true
- **overallStatus**: **REQUIRES_HUMAN_REVIEW**
- **overallReason**: Delta de capacités byte-identique au manifeste épinglé. Le bundle propose une refresh éditoriale dans les bornes déjà commercialisables ; revue PO requise avant merge.

## Gates
- `manifestDrift`: **green** — La ref demandée est byte-identique au manifeste épinglé.
- `declarationIntegrity`: **green** — Digest de la déclaration source conforme à l'épinglé.
- `truthLevelGate`: **green** — Source AUTHORITATIVE_MAIN.
- `selfServeCtaGate`: **green** — 3 capacité(s) self-serve reste(nt) internal_only (truth-check, grounded-truth-check, structured-generation). Le pipeline ne propose PAS d'activation publique.
- `maturityGate`: **green** — 9 déclarations éditoriales conformes au contrat de copy et au plafond manifeste.

## Surfaces
- `homepage` → **REQUIRES_HUMAN_REVIEW** — Squelette candidat émis dans les bornes commercialisables actuelles. PO doit approuver la rédaction éditoriale.
- `product_proof` → **REQUIRES_HUMAN_REVIEW** — Squelette candidat émis dans les bornes commercialisables actuelles. PO doit approuver la rédaction éditoriale.
- `faq` → **REQUIRES_HUMAN_REVIEW** — Squelette candidat émis dans les bornes commercialisables actuelles. PO doit approuver la rédaction éditoriale.
- `methodology` → **REQUIRES_HUMAN_REVIEW** — Squelette candidat émis dans les bornes commercialisables actuelles. PO doit approuver la rédaction éditoriale.

## Capability delta
- added: ∅
- removed: ∅
- changed: ∅
- declarationDiverged: false

## Opportunities
- **CAPABILITY_DELTA** `—` → — — Aucun delta GA à cette ref. Le contenu peut néanmoins bouger via d'autres signaux.
- **PRODUCT_KNOWLEDGE_DELTA** `wordpress-publication` → PRIVATE (clamped) — Déclaration éditoriale proposait PUBLIC_BETA mais le plafond manifeste est PRIVATE.
- **PRODUCT_KNOWLEDGE_DELTA** `native-composition-gutenberg` → PRIVATE (clamped) — Déclaration éditoriale proposait PUBLIC_EARLY_ACCESS mais le plafond manifeste est PRIVATE.
- **PRODUCT_KNOWLEDGE_DELTA** `asset-spec` → PRIVATE (clamped) — Déclaration éditoriale proposait INTERNAL_LABS mais le plafond manifeste est PRIVATE.
- **PRODUCT_KNOWLEDGE_DELTA** `geo-writer` → PRIVATE (clamped) — Déclaration éditoriale proposait INTERNAL_LABS mais le plafond manifeste est PRIVATE.
- **PRODUCT_KNOWLEDGE_DELTA** `owned-surface-design` → PRIVATE (clamped) — Déclaration éditoriale proposait INTERNAL_LABS mais le plafond manifeste est PRIVATE.
- **PRODUCT_KNOWLEDGE_DELTA** `query-intelligence` → PRIVATE (clamped) — Déclaration éditoriale proposait PUBLIC_ROADMAP mais le plafond manifeste est PRIVATE.
- **LABS_MATURITY_CHANGE** `opportunity-brief` → INTERNAL_LABS — Déclaration éditoriale conforme au plafond manifeste.
- **LABS_MATURITY_CHANGE** `repos-intersection` → INTERNAL_LABS — Déclaration éditoriale conforme au plafond manifeste.
- **PRODUCT_KNOWLEDGE_DELTA** `commit-to-content` → PRIVATE (clamped) — Déclaration éditoriale proposait INTERNAL_LABS mais le plafond manifeste est PRIVATE.
- **CONTENT_COVERAGE_GAP** `direct-share-of-model` → PUBLIC_GA — Capacité GA "direct-share-of-model" sans entrée maturity-declarations. Non bloquant — signale une couverture Labs/roadmap à compléter si utile.
- **CONTENT_COVERAGE_GAP** `indirect-mention-share` → PUBLIC_GA — Capacité GA "indirect-mention-share" sans entrée maturity-declarations. Non bloquant — signale une couverture Labs/roadmap à compléter si utile.
- **CONTENT_COVERAGE_GAP** `observe-authority-presence` → PUBLIC_GA — Capacité GA "observe-authority-presence" sans entrée maturity-declarations. Non bloquant — signale une couverture Labs/roadmap à compléter si utile.
- **CONTENT_COVERAGE_GAP** `quality-ledger` → PUBLIC_GA — Capacité GA "quality-ledger" sans entrée maturity-declarations. Non bloquant — signale une couverture Labs/roadmap à compléter si utile.
- **CONTENT_COVERAGE_GAP** `total-authority-presence` → PUBLIC_GA — Capacité GA "total-authority-presence" sans entrée maturity-declarations. Non bloquant — signale une couverture Labs/roadmap à compléter si utile.

