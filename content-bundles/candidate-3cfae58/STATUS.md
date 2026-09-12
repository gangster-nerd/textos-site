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
- `selfServeCtaGate`: **green** — Aucune activation self-serve n'est proposée. Capacités absentes/insuffisantes : self-serve-onboarding (absent du manifeste), authenticated-product-entry (absent du manifeste), ui-measurement-launch (absent du manifeste).
- `maturityGate`: **green** — Évaluées: 1 (commit-to-content). Quarantaine (proposition stockée, non publiable): 8 (wordpress-publication, native-composition-gutenberg, asset-spec, geo-writer, owned-surface-design, query-intelligence, opportunity-brief, repos-intersection).

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

## Promotion requests
- `wordpress-publication` → **PRODUCT_MANIFEST_ENTRY_REQUIRED** (owner: T0) — Capacité absente du manifeste épinglé. Le plafond est PRIVATE, la maturité proposée (PUBLIC_BETA) est clampée.
- `native-composition-gutenberg` → **PRODUCT_MAIN_REQUIRED** (owner: T0) — Capacité présente uniquement à la ref CANDIDATE R2, absente à la ref AUTHORITATIVE_MAIN — non-autoritative.
- `asset-spec` → **PRODUCT_MANIFEST_ENTRY_REQUIRED** (owner: T0) — Capacité absente du manifeste épinglé. Le plafond est PRIVATE, la maturité proposée (INTERNAL_LABS) est clampée.
- `geo-writer` → **PRODUCT_MANIFEST_ENTRY_REQUIRED** (owner: T0) — Capacité absente du manifeste épinglé. Le plafond est PRIVATE, la maturité proposée (INTERNAL_LABS) est clampée.
- `owned-surface-design` → **PRODUCT_MANIFEST_ENTRY_REQUIRED** (owner: T0) — Capacité absente du manifeste épinglé. Le plafond est PRIVATE, la maturité proposée (INTERNAL_LABS) est clampée.
- `query-intelligence` → **PRODUCT_MANIFEST_ENTRY_REQUIRED** (owner: T0) — Capacité absente du manifeste épinglé. Le plafond est PRIVATE, la maturité proposée (PUBLIC_ROADMAP) est clampée.
- `opportunity-brief` → **CPO_DISCLOSURE_APPROVAL_REQUIRED** (owner: CPO) — Manifeste = internal_only. internal_only n'est PAS une autorité de divulgation.
- `repos-intersection` → **CPO_DISCLOSURE_APPROVAL_REQUIRED** (owner: CPO) — Manifeste = internal_only. internal_only n'est PAS une autorité de divulgation.

## Opportunities
- **CAPABILITY_DELTA** `—` → — — Aucun delta GA à cette ref. Le contenu peut néanmoins bouger via d'autres signaux.
- **PRODUCT_KNOWLEDGE_DELTA** `wordpress-publication` → PRIVATE (clamped) — Aucune autorité de divulgation (disclosureAuthority=NONE). internal_only, candidate ou implémentation ne suffisent pas.
- **PRODUCT_KNOWLEDGE_DELTA** `native-composition-gutenberg` → PRIVATE (clamped) — Aucune autorité de divulgation (disclosureAuthority=NONE). internal_only, candidate ou implémentation ne suffisent pas.
- **PRODUCT_KNOWLEDGE_DELTA** `asset-spec` → PRIVATE (clamped) — Aucune autorité de divulgation (disclosureAuthority=NONE). internal_only, candidate ou implémentation ne suffisent pas.
- **PRODUCT_KNOWLEDGE_DELTA** `geo-writer` → PRIVATE (clamped) — Aucune autorité de divulgation (disclosureAuthority=NONE). internal_only, candidate ou implémentation ne suffisent pas.
- **PRODUCT_KNOWLEDGE_DELTA** `owned-surface-design` → PRIVATE (clamped) — Aucune autorité de divulgation (disclosureAuthority=NONE). internal_only, candidate ou implémentation ne suffisent pas.
- **PRODUCT_KNOWLEDGE_DELTA** `query-intelligence` → PRIVATE (clamped) — Aucune autorité de divulgation (disclosureAuthority=NONE). internal_only, candidate ou implémentation ne suffisent pas.
- **PRODUCT_KNOWLEDGE_DELTA** `opportunity-brief` → PRIVATE (clamped) — Aucune autorité de divulgation (disclosureAuthority=NONE). internal_only, candidate ou implémentation ne suffisent pas.
- **PRODUCT_KNOWLEDGE_DELTA** `repos-intersection` → PRIVATE (clamped) — Aucune autorité de divulgation (disclosureAuthority=NONE). internal_only, candidate ou implémentation ne suffisent pas.
- **LABS_MATURITY_CHANGE** `commit-to-content` → INTERNAL_LABS — COMPANY_TECHNOLOGY story approuvée CPO — non gouvernée par le manifeste produit mais TERMINALEMENT plafonnée à INTERNAL_LABS (toute promotion commerciale exige une requalification PRODUCT_CAPABILITY).
- **CONTENT_COVERAGE_GAP** `direct-share-of-model` → PUBLIC_GA — Capacité GA "direct-share-of-model" sans entrée maturity-declarations. Non bloquant — signale une couverture Labs/roadmap à compléter si utile.
- **CONTENT_COVERAGE_GAP** `indirect-mention-share` → PUBLIC_GA — Capacité GA "indirect-mention-share" sans entrée maturity-declarations. Non bloquant — signale une couverture Labs/roadmap à compléter si utile.
- **CONTENT_COVERAGE_GAP** `observe-authority-presence` → PUBLIC_GA — Capacité GA "observe-authority-presence" sans entrée maturity-declarations. Non bloquant — signale une couverture Labs/roadmap à compléter si utile.
- **CONTENT_COVERAGE_GAP** `quality-ledger` → PUBLIC_GA — Capacité GA "quality-ledger" sans entrée maturity-declarations. Non bloquant — signale une couverture Labs/roadmap à compléter si utile.
- **CONTENT_COVERAGE_GAP** `total-authority-presence` → PUBLIC_GA — Capacité GA "total-authority-presence" sans entrée maturity-declarations. Non bloquant — signale une couverture Labs/roadmap à compléter si utile.

