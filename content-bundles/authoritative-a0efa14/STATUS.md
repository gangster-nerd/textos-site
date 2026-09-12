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

