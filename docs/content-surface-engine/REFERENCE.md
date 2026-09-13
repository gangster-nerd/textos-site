# CSE-2 — REFERENCE surface

`renderVersion = reference@1` · `surfacePolicyVersion = textos-site@1`

## Topology (unchanged from CSE-1)

```
ContentDocument + SurfacePolicy
    → resolveContentSurface()
        → ResolvedContentSurface
            → REFERENCE renderer (reference@1)
```

CSE-2 adds the first concrete consumer: a generic renderer, a TextOS SurfacePolicy, an
authority compiler (metadata + JSON-LD), a CTA bridge to the existing registry, an
instrumentation seam (events + AttributionTouch), and a minimal Next.js route surfacing three
fixtures.

## Reconciliation

| CONCEPT | CURRENT | CSE CORE | TEXTOS POLICY | REFERENCE | ADOPT / ADAPT / REJECT | WHY |
| --- | --- | --- | --- | --- | --- | --- |
| site shell | `app/layout.tsx` + `SiteHeader` | out | uses existing shell verbatim | wrapped by managed surface | **ADOPT** | shell is already minimal; no reason for CSE to duplicate it |
| typography | `app/globals.css` (Geist tokens) | out | consumes tokens | ditto | **ADOPT** | design tokens are governed elsewhere |
| breadcrumb | not implemented for FAQ/methodology | out | `navigation.showBreadcrumbs` policy flag | rendered by managed surface | **ADAPT** | keep flag generic, TextOS copy in managed surface |
| content header | inline in `app/faq/[slug]` | out | managed surface header | ditto | **ADAPT** | migrate the shape, not the FAQ template |
| author presentation | absent on origin/main | out | `authorDisplay.showAuthor` policy | managed surface byline | **ADAPT** | policy toggles, registry stays outside CSE core |
| status presentation | inline in FAQ (`doc__status`) | `truth.publicationStatus` only | managed surface `Status` badge for non-published | ditto | **ADAPT** | badge is presentation, status is truth |
| short answer | inline via `shortAnswer.body` frontmatter | `answer` block kind | rendered by generic block renderer | ditto | **ADAPT** | move from frontmatter into semantic block |
| TOC | absent | out | `navigation.showTableOfContents` + managed threshold (≥3 headings) | managed surface `<nav>` | **ADAPT** | thresholds are presentation |
| reading time | absent | out | not emitted in CSE-2 | — | **REJECT** *(core)* | derived presentation heuristic, defer |
| body blocks | Markdown via `react-markdown` | semantic block vocabulary | policy filters visibility | generic block renderer | **ADAPT** | rebuild against semantic blocks, drop markdown parsing |
| figures / evidence | `ContentVisual` component | `figure`/`evidence` blocks | uses generic block renderers | ditto | **ADAPT** | article-visual registry stays out of CSE-2 |
| CTA placement | `ContentCta` at end | `cta_slot` block + `conversion.ctaIntentId` | policy `allowCta` + slot regions | managed surface renders resolved CTA | **ADAPT** | bridge to existing registry, no core copy |
| sources / method | absent | `source` block kind | managed surface `Sources` list | derived from `source` blocks | **ADAPT** | list is derived, not authored twice |
| related-content placeholder | inline `<nav aria-label="Related">` | `relationships.relatedContentIds` | policy `showRelatedContent` | managed surface list | **ADAPT** | data on document, presentation in surface |
| revision / history | `updatedAt` on frontmatter | `lifecycle.*` | not surfaced in CSE-2 UI | data attribute only | **ADAPT** | full revision UI deferred |
| JSON-LD | `buildArticleJsonLd` in `lib/schema-org/build-article.ts` | out | `metadata.emitSchemaOrg` + `schemaType` policy | authority compiler | **ADAPT** | new compiler consumes resolved surface, existing helper untouched |
| Open Graph | in `app/layout.tsx` and `app/faq/[slug]/generateMetadata` | out | compiled from resolved surface | preview route `generateMetadata` | **ADAPT** | central compiler emits full block |
| sitemap | `app/sitemap.ts` (FAQ only) | out | preview route NOT added to sitemap | untouched | **REJECT** *(for CSE-2)* | preview is not a public destination |
| instrumentation | none | out | `analytics.surfaceTag` on policy | `createEmitter`, `AttributionTouch` | **ADOPT** *(new)* | first-party ingestion only |

## Modules

- `lib/content-surface-engine/renderer/**` — generic block renderers, ManagedTextosSurface.
- `lib/content-surface-engine/surface-policy/**` — `textos-site@1` policy instance(s).
- `lib/content-surface-engine/authority/**` — `compileAuthority()` producing Metadata + JSON-LD.
- `lib/content-surface-engine/conversion/**` — semantic intent → CTA registry variant bridge.
- `lib/content-surface-engine/instrumentation/**` — event emitter and AttributionTouch.
- `lib/content-surface-engine/site-integration/**` — preview catalog, inline author bridge.
- `lib/content-surface-engine/conformance/surface-pass/**` — three fixtures + rendered HTML
  snapshots at desktop and ~400px viewports (visual evidence) + MANIFEST.json (per-file
  sha256).

## Non-goals (deferred)

- Migration of the 12 public insight articles (still lives on the reference branch).
- Full ARDatalog / link graph / freshness surfaces.
- FAQPage / HowTo JSON-LD (only emitted when the semantic vocabulary makes them faithful).
- Reading time and per-article revision history UI.
- Any change to NATIVE seam or product manifest.

## Instrumentation contract

- Events: `content_viewed`, `short_answer_viewed`, `toc_used`, `internal_link_clicked`,
  `cta_viewed`, `cta_clicked`. Emitter shape: `createEmitter({ mode, endpoint, fetchImpl? })`.
- `mode !== "live"` ⇒ deterministic no-op.
- The site is a **static export** (`output: "export"` in `next.config.mjs`) so no in-app
  ingestion route is bundled. The `endpoint` value is passed to the emitter by the consumer
  (typically a first-party edge worker or platform endpoint). CSE-2 ships the seam, not the
  sink.
- Product CTA click:
  1. Site generates opaque 128-bit `attributionId` (base64url).
  2. Site persists `AttributionTouch` server-side (in-memory store in CSE-2).
  3. URL appended with `aid=<id>` only, alongside authorized keys `intent`, `source`.
  4. No `contentId`, `slug`, `email`, `user`, `targetQuery`, or PII in the URL.
- Product-side handling of `aid` is out of scope.

## SURFACE_PASS v1

Certified via `tests/cse2-reference-surface.test.tsx` (17 tests):
accessible semantic structure, responsive at ~400px (via CSS media query in the snapshot
generator), renderer determinism, unsupported-block fail-closed, metadata composition, JSON-LD
structural validity, visible/schema parity, CTA fail-closed behavior, instrumentation no-op
outside live, draft-remains-noindex, product-CTA aid rules, and NATIVE seam untouched.

Visual evidence: six HTML files under
`lib/content-surface-engine/conformance/surface-pass/snapshots/` (three fixtures × two
viewports), plus `MANIFEST.json` with sha256 of each snapshot. Open any file in a browser to
review desktop / mobile rendering.

Regenerate with: `pnpm tsx scripts/cse2-render-snapshots.ts`.
