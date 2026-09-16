# CTC-CSE-CONVERGENCE-1 — ownership matrix

Base: `main @ 7e2e74b2` (CSE Lane A merged: A1 `41e370c` + A2 `4860834` + A3 `7e6bb53` + review-fix `569ea3b`).

Purpose: classify every file changed across PR #17, #18, #19 so the convergence branch
imports each once, from its rightful owner, without carrying a parallel composition
engine forward.

The shared boundary is **`ContentDocument`** (`lib/content-surface-engine/contract/content-document.ts`).
Commit-to-Content produces `ContentDocument`s. Content Surface Engine composes and renders
them.

## Categories

- **CTC_PRODUCER** — owned by Commit-to-Content. Facts, authority, editorial state.
- **CONTENT_DOCUMENT_CONTRACT** — shared between producers and CSE.
- **CSE_REFERENCE_RENDERER** — owned by Content Surface Engine.
- **SITE_SHELL** — owned by textos-site (header, nav, layout).
- **DUPLICATE_OR_SUPERSEDED** — replaced by CSE ; do NOT import into convergence.
- **NATIVE_FORBIDDEN** — must not be touched until PA_RECEIPT_VERIFIED.

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
