# ARTICLE-SYSTEM-1 assessment (from COMPOSER)

Read-only inspection of `feat/ctc-article-system-1` (43a1a83). This document is migration
guidance for a future REFERENCE renderer / producer wiring — not an architecture source.
Every ARTICLE-SYSTEM-1 concept is one of ADOPT, ADAPT, REJECT.

## ADOPT

- **Two-layer publication contract.** A producer-agnostic `ContentDocument` upstream of a
  policy-driven surface resolution downstream. ARTICLE-SYSTEM-1 has no explicit split — CSE-1
  adds it. The idea that "editorial identity + truth + provenance are separable from
  rendering" is validated by the article corpus and adopted in the core.
- **Related-content identifiers as data, not derived links.** ARTICLE-SYSTEM-1 declares
  `relatedContentIds` on every article. Adopted in `relationships.relatedContentIds`. The
  graph itself is a consumer concern.
- **A T0 certified lineage of product SHAs.** `AUTHORITATIVE_MAIN_SHA` and
  `R2_CANDIDATE_SHA` in `lib/commit-to-content/resolve-product-ref.ts` are explicit authority
  declarations. Adopted as `content/certified-lineage.json`, with fail-closed resolution.

## ADAPT

- **Frontmatter schema.** ARTICLE-SYSTEM-1 extends `ContentFrontmatterSchema` in place —
  productive for the article corpus, but conflates product-specific vocabulary
  (`editorialClass`, `truthMode`, `sourceSemantics`, `sourceDigests`) with the shared
  publication contract. ADAPT: keep those fields in the *producer* layer; expose only
  normalized `publicationStatus` + `allowedSurfaces` to COMPOSER; carry the rest as opaque
  `sourceStatus` / `statusVocabulary`.
- **Author / topic registries.** Valuable governance mechanism, but registry ENFORCEMENT
  belongs to the producer. COMPOSER carries opaque `authorIds` / `topicIds`. The registries
  themselves stay in the producer or in a future REFERENCE renderer package.
- **Lifecycle fields.** `firstPublishedAt / lastReviewedAt / revisionNumber / revisionSummary`
  are useful, but the article-system enforces them as required for `/insights`. ADAPT: make
  them optional in the shared contract so non-article producers can omit them.
- **CTA policy.** `ctaVariant=none` for `EXPERIMENT` / `COMPANY_TECHNOLOGY` is a
  product-editorial rule, not a composition rule. ADAPT: expose `conversionAllowed` on the
  document and `allowCta` on the SurfacePolicy; the intersection is the effective decision.
- **Indexability rule.** "Only `published` can be `index`" is genuinely generic; ADAPT into
  the shared invariant. The article-system's per-class rules (e.g. `ROADMAP_DIRECTION` must
  be `PROSPECTIVE`) are REJECTED from the core (stays in producer).
- **Provenance model.** `productSnapshotSha + evidenceRefs + sourceDigests` → ADAPT to
  `sourceRepository + sourceSha + sourceAuthority + sourceEvidenceDigest`, with authority
  gated by certified-lineage.

## REJECT

- **`editorialClass` / `truthMode` cross-constraints** in the shared schema — product
  vocabulary; belongs upstream.
- **`article-derivations.ts`** (heading extraction, reading time, word count, canonical
  path derivation from Markdown) — presentation heuristics for the article renderer.
- **`build-article-graph.ts`** — Article/TechArticle/BlogPosting JSON-LD is renderer output;
  the core exposes `emitSchemaOrg` and a `schemaType` string only.
- **`link-graph.ts`, `backlink-candidates.ts`, `freshness.ts`, `copy-safety.ts`,
  `insight-verifier.ts`** — presentation / linting / QA concerns, none in the composition
  path.
- **`/insights` route and Article renderer** — out of scope for CSE-1 by design.
- **Frontmatter `disclaimer` string constraints** — product-editorial policy, not COMPOSER.
- **Mixing `changelog_entry` / `faq_entry` / `product_article` into a single article schema**
  — the shared schema treats `contentType` as an opaque string; consumers specialize.

## Notes for a future migration

- The 12 existing insight articles remain a CONFORMANCE CORPUS. When the REFERENCE renderer
  is built, an adapter must convert their frontmatter + Markdown into `ContentDocument`s and
  round-trip through `resolveContentSurface`. That work does not modify the core.
- `sourceDigests` on individual files is a useful producer receipt, but not a composition
  input. Keep it in the producer bundle and, if needed, surface a single
  `sourceEvidenceDigest` per document.
- Neither the `/insights` route nor the article renderer are permitted to introduce a second
  authoring source alongside `ContentDocument`.
