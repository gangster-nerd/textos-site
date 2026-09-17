# CTC-CSE-CONVERGENCE-1 — ownership matrix

## A2R-PORT correction (2026-09-17)

The initial convergence PR classified nearly every PR #19 change as
`REJECTED_DUPLICATE`. That was too aggressive : it lumped PROVEN presentation
behaviour into the same bucket as the parallel composition engine.

A2R-PORT rewrites the matrix with a nuanced disposition set :

- **REUSED_AS_CONTRACT** — producer-side facts left with the producer.
- **PORTED_TO_CSE** — PR #19 presentation behaviour has been faithfully re-implemented
  against `ResolvedContentSurface`. Automated functional parity demonstrated.
- **SUPERSEDED_CANDIDATE** — CSE now has an equivalent, but functional AND visual
  parity are not yet fully certified. Kept in this list until A2R's non-vacuous
  mutation tests + visual acceptance pass.
- **SUPERSEDED_BY_CSE** — both (1) automated parity is demonstrated AND (2) visual
  parity or improvement is certified against the PR #19 acceptance oracle.

Base: `main @ 7e2e74b2` (CSE Lane A merged: A1 `41e370c` + A2 `4860834` + A3 `7e6bb53` + review-fix `569ea3b`).

Purpose: classify every file changed across PR #17, #18, #19 so the convergence branch
imports each once, from its rightful owner, while the presentation surface is
recertified against the sealed A1R contract.

The shared boundary is **`ContentDocument`** (`lib/content-surface-engine/contract/content-document.ts`).
Commit-to-Content produces `ContentDocument`s. Content Surface Engine composes and renders
them.

## Categories

- **CTC_PRODUCER** — owned by Commit-to-Content. Facts, authority, editorial state.
- **CONTENT_DOCUMENT_CONTRACT** — shared between producers and CSE.
- **CSE_REFERENCE_RENDERER** — owned by Content Surface Engine.
- **SITE_SHELL** — owned by textos-site (header, nav, layout).
- **REUSED_AS_CONTRACT / PORTED_TO_CSE / SUPERSEDED_CANDIDATE / SUPERSEDED_BY_CSE** — A2R disposition (see above).
- **NATIVE_FORBIDDEN** — must not be touched until PA_RECEIPT_VERIFIED.

## A2R disposition per PR #19 component

| PR #19 component | A1 verdict | A2R disposition | Note |
|---|---|---|---|
| `app/insights/[slug]/page.tsx` (article route composer) | REJECTED_DUPLICATE | **PORTED_TO_CSE** | Article-route thin adapter reads `ResolvedContentSurface` and delegates to `ManagedTextosSurface` + `RenderReferenceBody`. No Markdown reparse. |
| `app/insights/topic/[slug]/page.tsx` | REJECTED_DUPLICATE | **SUPERSEDED_CANDIDATE** | Topic-hub route deferred to A3R. Corpus does not yet carry stable `topicIds` aligned with hub slugs. |
| `app/insights/page.tsx` (index) | REJECTED_DUPLICATE | **PORTED_TO_CSE** | Reuses managed corpus listing. |
| `app/sitemap.ts` | SUPERSEDED_BY_CSE | **SUPERSEDED_CANDIDATE** | Full sitemap recertification is A3R. |
| `components/content/ContentCta.tsx` (composer) | REJECTED_DUPLICATE | **SUPERSEDED_BY_CSE** | CSE `resolveReferenceCta` + `buildCtaAttributionHref` + slot-position rendering replace it end-to-end. Attribution URL parity certified. |
| `components/site/SiteHeader.tsx` (Insights nav entry) | REJECTED_DUPLICATE | **SUPERSEDED_CANDIDATE** | The Insights breadcrumb is emitted by the surface (`breadcrumbInsights`) but the global `SiteHeader` nav update is not required for A2R. |
| `content/insights/*.md` (×12) | REUSED_AS_CONTRACT | **REUSED_AS_CONTRACT** | Authoritative producer source. Compiled to ContentDocument via A1R Markdown compiler. |
| `lib/content/article-derivations.ts` | REJECTED_DUPLICATE | **PORTED_TO_CSE** | `slugifyHeading`, `extractHeadings`, `readingTime` are re-implemented as CSE `assignHeadingIds` / `phrasingToPlainText` on the SEALED semantic tree. |
| `lib/content/author-registry.ts` | REUSED_AS_CONTRACT | **PORTED_TO_CSE** | CSE `resolveReferenceEntity` distinguishes Person / Organization ; A1R EditorialIdentityPolicy governs. |
| `lib/content/topic-registry.ts` | REUSED_AS_CONTRACT | **REUSED_AS_CONTRACT** | Producer taxonomy. Not consumed by the renderer directly. |
| `lib/content/link-graph.ts` | REJECTED_DUPLICATE | **SUPERSEDED_BY_CSE** | CSE `link-graph/` module carries it. |
| `lib/content/freshness.ts` | REJECTED_DUPLICATE | **SUPERSEDED_CANDIDATE** | CSE `lifecycle/` covers current cases ; parity check for edge lifecycle states is A3R. |
| `lib/content/insight-verifier.ts` | REUSED_AS_CONTRACT | **REUSED_AS_CONTRACT** | Producer-side gates. |
| `lib/content/content-schema.ts` | REUSED_AS_CONTRACT | **REUSED_AS_CONTRACT** | Producer frontmatter contract. |
| `lib/conversion/cta-registry.ts` | REUSED_AS_CONTRACT | **REUSED_AS_CONTRACT** | Governed CTA intents. Consumed by CSE `resolveReferenceCta`. |
| `lib/schema-org/build-article-graph.ts` | REJECTED_DUPLICATE | **SUPERSEDED_BY_CSE** | CSE `compileAuthority` produces the JSON-LD graph including draft WebPage / published Article split. |
| `public/og/insights/*.svg` (×12) | PORTED_AS_CSE_TEST | **PORTED_TO_CSE** | 12 SVGs sourced from `ctc-pr19-oracle-c88d3af` under `public/og/insights/`. Wired into `generateMetadata` (OG + Twitter summary_large_image). |
| `scripts/backlink-candidates.ts` | REJECTED_DUPLICATE | **SUPERSEDED_BY_CSE** | CSE `computeBacklinkCandidates`. |
| `scripts/generate-social-cards.ts` | REUSED_AS_CONTRACT | **REUSED_AS_CONTRACT** | Producer tooling. Not modified. |
| `scripts/validate-jsonld.mjs` | SITE_SHELL | **SITE_SHELL** | Site gate. |
| `tests/article-derivations.test.ts` | REJECTED_DUPLICATE | **PORTED_TO_CSE** | A2R re-covers heading id derivation on the SEALED semantic tree. |
| `tests/link-graph.test.ts` | REJECTED_DUPLICATE | **SUPERSEDED_BY_CSE** | CSE link-graph tests already on main. |
| `tests/insights-a11y-source.test.ts` | REJECTED_DUPLICATE | **PORTED_TO_CSE** | A2R adds non-vacuous HTML tests (`a2r-*.test.ts`) that ALWAYS run against a fresh build, never `describe.skipIf`. |
| `tests/insights-frontmatter-contract.test.ts` | REJECTED_DUPLICATE | **PORTED_TO_CSE** | The path-aware invariants are enforced by A1R producer-schema + editorial-identity-policy. |

## Sum-count per A2R disposition

| Disposition | Count |
|---|---|
| REUSED_AS_CONTRACT (producer facts) | 7 |
| PORTED_TO_CSE (functional parity demonstrated) | 9 |
| SUPERSEDED_BY_CSE (functional + visual parity) | 5 |
| SUPERSEDED_CANDIDATE (parity in progress) | 4 |



## Matrix

### From PR #17 (CTC-9A — governed editorial platform)

| File | Category | Disposition |
|---|---|---|
| `app/insights/page.tsx` | DUPLICATE_OR_SUPERSEDED | Replaced by convergence route wired to CSE catalog. `REJECTED_DUPLICATE`. |
| `app/insights/[slug]/page.tsx` | DUPLICATE_OR_SUPERSEDED | Replaced by convergence route delegating to `ManagedTextosSurface`. `REJECTED_DUPLICATE`. |
| `content-bundles/corpus-inventory/…` | CTC_PRODUCER | Governed inputs — already on `main`. `REUSED_AS_CONTRACT`. |
| `docs/decisions/CMO-2026-09-12-product-thinking-disclosure.md` | CTC_PRODUCER | Governance record — already on `main`. |
| `lib/content/content-loader.ts`, `content-schema.ts`, `copy-safety.ts`, `insight-verifier.ts` | CTC_PRODUCER | Frontmatter/verifier logic — kept **producer-side** as CTC. Not imported by CSE. Producer contract for future insight md → ContentDocument migration. |
| `scripts/corpus-digest.ts` | CTC_PRODUCER | Producer utility. |
| `tests/insights-empty-collection.test.ts` | DUPLICATE_OR_SUPERSEDED | Empty-state now enforced by `visibleEntries` in convergence route. `REJECTED_DUPLICATE`. |
| `tests/product-manifest.test.ts` | CTC_PRODUCER | Producer proof — kept on producer side. |

### From PR #18 (CTC-9B — the 12 md articles)

| File | Category | Disposition |
|---|---|---|
| `content/insights/*.md` (×12) | CTC_PRODUCER | The **prose** is the producer's authoritative record. The A3 migration already lifted these into `content/managed-corpus/*.json`. The .md files remain the CTC producer form ; the ContentDocument JSON is the CSE contract form. `REUSED_AS_CONTRACT` via the A3 migration script. |

### From PR #19 (CTC-ARTICLE-SYSTEM-1 + CTO fix commits)

| File | Category | Disposition |
|---|---|---|
| `app/insights/[slug]/page.tsx` | DUPLICATE_OR_SUPERSEDED | Standalone Markdown → JSX → Article-graph → CTA composition engine. `REJECTED_DUPLICATE`. Convergence replaces it with a CSE-backed adapter. |
| `app/insights/topic/[slug]/page.tsx` | DUPLICATE_OR_SUPERSEDED | Topic hub composition. Not imported. Follow-up : CSE surface-policy can add a topic-hub surface once the corpus carries stable `topicIds`. `REJECTED_DUPLICATE` for now. |
| `app/insights/page.tsx` | DUPLICATE_OR_SUPERSEDED | Replaced by convergence index. `REJECTED_DUPLICATE`. |
| `app/sitemap.ts` | SITE_SHELL | CSE has its own site-integration ; the CTC-9A sitemap on main already covers current collections. `SUPERSEDED_BY_CSE` — do not import PR #19 sitemap changes. |
| `app/faq/[slug]/page.tsx`, `app/methodology/[slug]/page.tsx`, `app/page.tsx` | SITE_SHELL | Only touched to migrate `position="end"` → `position="final"`. Not imported ; if convergence later reworks those routes to CSE, this is a follow-up. `REJECTED_DUPLICATE`. |
| `components/content/ContentCta.tsx` | DUPLICATE_OR_SUPERSEDED | CSE has `resolveReferenceCta` + surface-policy CTA authorisation ; `ManagedTextosSurface` renders the CTA. `REJECTED_DUPLICATE`. |
| `components/site/SiteHeader.tsx` | SITE_SHELL | Nav change (adds Insights link). Belongs to site shell but the convergence branch already ships the Insights route so this is optional dressing — `SUPERSEDED_BY_CSE` route pattern ; the actual link can be added as a small follow-up if the header design changes. `REJECTED_DUPLICATE` in this convergence. |
| `content/insights/*.md` (×12) | CTC_PRODUCER | The prose is preserved. The CTO §1 metadata truth (reviewerIds=[], lastReviewedAt=null) is re-asserted directly in the `content/managed-corpus/*.json` corpus that A3 emitted. `REUSED_AS_CONTRACT`. |
| `lib/content/article-derivations.ts` | DUPLICATE_OR_SUPERSEDED | Reading time, ToC extraction, related-content scoring, heading-id disambiguation. CSE composes these (composition-signature, block-ordered rendering, related_content_slot). `REJECTED_DUPLICATE`. |
| `lib/content/author-registry.ts` | CTC_PRODUCER | Governed entity registry (Person vs Organization). Persists on the CTC producer side ; CSE's `resolveReferenceAuthor` remains the thin lookup CSE uses (extended in this convergence with `entityType`). `REUSED_AS_CONTRACT`. |
| `lib/content/topic-registry.ts` | CTC_PRODUCER | Governed taxonomy. Persists on the CTC producer side. `REUSED_AS_CONTRACT`. |
| `lib/content/link-graph.ts` | DUPLICATE_OR_SUPERSEDED | CSE has `lib/content-surface-engine/link-graph/` with `computeLinkGraph` + `computeBacklinkCandidates`. `REJECTED_DUPLICATE`. |
| `lib/content/freshness.ts` | DUPLICATE_OR_SUPERSEDED | CSE has `lifecycle/evaluateLifecycle` producing lifecycle states. `REJECTED_DUPLICATE`. |
| `lib/content/insight-verifier.ts` | CTC_PRODUCER | Frontmatter-level path-aware invariants (draft/published, image asset, cta marker). Kept on producer side ; CSE `evaluateContentPass('textos.article@1')` covers the ContentDocument-level equivalents. `REUSED_AS_CONTRACT`. |
| `lib/content/content-schema.ts` | CTC_PRODUCER | Frontmatter schema. Producer side. `REUSED_AS_CONTRACT`. |
| `lib/conversion/cta-registry.ts` | CTC_PRODUCER | CTA variants (governed intents). Producer side. CSE surface conversion `resolveReferenceCta` remains the composition layer. `REUSED_AS_CONTRACT`. |
| `lib/schema-org/build-article-graph.ts` | DUPLICATE_OR_SUPERSEDED | JSON-LD @graph composition. CSE has `compileAuthority({...})` emitting the equivalent graph. `REJECTED_DUPLICATE`. |
| `public/og/insights/*.svg` (×12) | CTC_PRODUCER (asset) | Deterministic 1200×630 social cards. Currently not consumed by CSE — carried forward as `PORTED_AS_CSE_TEST` (asset lives in producer inventory ; CSE will bind them when the ContentDocument gains an `image` block). `PORTED_AS_CSE_TEST`. |
| `scripts/backlink-candidates.ts` | DUPLICATE_OR_SUPERSEDED | CSE has `computeBacklinkCandidates`. `REJECTED_DUPLICATE`. |
| `scripts/generate-social-cards.ts` | CTC_PRODUCER (tooling) | Producer tooling. Kept on producer side. Not imported here. |
| `scripts/content-verify.ts` | CTC_PRODUCER | Producer gate. On main under CTC-9A ; not modified by convergence. |
| `scripts/validate-jsonld.mjs` | SITE_SHELL | Site gate. On main ; not modified. |
| `tests/*.test.ts` (article-system suites) | DUPLICATE_OR_SUPERSEDED | Tests target the rejected renderer/registry. Their intent is preserved through CSE's `content-pass`, `surface-pass`, `publication-pass`, `link-graph`, and `authority` tests (already on main). `PORTED_AS_CSE_TEST` where the invariant is not already covered ; `REJECTED_DUPLICATE` for the composition-layer tests. |

## Sum-count per disposition

| Disposition | Count |
|---|---|
| REUSED_AS_CONTRACT (CTC-producer files kept, referenced not re-imported) | 20 |
| PORTED_AS_CSE_TEST (invariants preserved via CSE tests) | 3 (backlink → CSE test ; a11y → CSE test ; social image → asset ported for future wiring) |
| SUPERSEDED_BY_CSE (site shell/sitemap rendered by CSE now) | 2 |
| REJECTED_DUPLICATE (competing composition engine — do not import) | 14 |

## Producer / engine boundary

```
Commit-to-Content (producer)
  content/insights/*.md   ← authoritative prose + frontmatter
  lib/content/content-schema.ts       ← producer schema
  lib/content/insight-verifier.ts     ← producer gates
  lib/content/author-registry.ts      ← governed entities
  lib/content/topic-registry.ts       ← governed taxonomy
  lib/conversion/cta-registry.ts      ← governed CTA intents
  scripts/generate-social-cards.ts    ← producer asset tooling
  public/og/insights/*.svg            ← governed assets
              │
              │  A3 migration (scripts/a3-migrate-corpus.ts)
              ▼
  content/managed-corpus/*.json       ← ContentDocument (shared boundary)
              │
              ▼
Content Surface Engine
  lib/content-surface-engine/contract      ← ContentDocument, SurfacePolicy, ResolvedContentSurface
  lib/content-surface-engine/composition   ← resolveContentSurface, provenance authority
  lib/content-surface-engine/renderer      ← REFERENCE renderer, ManagedTextosSurface
  lib/content-surface-engine/conformance   ← CONTENT_PASS, SURFACE_PASS, corpus-loader
  lib/content-surface-engine/publication   ← PUBLICATION_PASS, INDEXABLE
  lib/content-surface-engine/lifecycle     ← lifecycle states
  lib/content-surface-engine/link-graph    ← link + backlink graph
  lib/content-surface-engine/site-integration ← preview-catalog, insights-catalog, authors
  lib/content-surface-engine/surface-policy   ← textosArticleReferencePolicy, minimal
              │
              ▼
textos-site (surface consumer — this convergence adds ONE new file per route)
  app/insights/page.tsx           ← thin index over listInsightEntries()
  app/insights/[slug]/page.tsx    ← thin article route, delegates rendering to CSE
  app/reference-preview/[slug]/page.tsx ← A2 SURFACE_PASS fixtures (existing)
```

**Any file that duplicates CSE composition, renderer, block ordering, schema rendering,
related-content presentation, or CTA presentation is REJECTED_DUPLICATE.** The convergence
branch never re-introduces the PR #19 composition engine.
