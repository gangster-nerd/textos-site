# CSE-1 reconciliation — ARTICLE-SYSTEM-1 vs. COMPOSER

ARTICLE-SYSTEM-1 (`feat/ctc-article-system-1`) is reference material only. No concept is
inherited by default. Every candidate concept is classified below.

| CONCEPT | CURRENT ON origin/main | ARTICLE-SYSTEM-1 POSITION | COMPOSER DECISION | RATIONALE | TARGET LAYER |
| --- | --- | --- | --- | --- | --- |
| ContentDocument | Absent as a shared contract; `ContentFrontmatter` conflates article frontmatter with everything else. | Article-focused frontmatter, extended in-place. | **ADAPT** | A neutral, semantic publication contract is required. Reframe as producer-agnostic. | `contract/content-document.ts` |
| Body blocks | Body is opaque Markdown. | Markdown-only body + derivations (TOC, reading time). | **ADAPT** | The core needs semantic blocks (`answer`, `evidence`, `steps`, `cta_slot`, …) — visual blocks like Hero rejected. | `contract/content-document.ts` (BLOCK_KINDS) |
| Editorial identity (author, reviewers, topics) | Not modelled at document level. | `author-registry`, `topic-registry` with registry membership enforcement. | **ADAPT** | Carry identifiers on the document; do NOT bake registries into the core. Registries stay a producer/consumer concern. | `contract/content-document.ts` (EditorialSchema) |
| Truth / status | `editorialStatus` = draft/review/published/archived, single vocabulary. | Same enum + `editorialClass` / `truthMode` cross-constraints. | **ADAPT** | Split into (opaque) `sourceStatus` + (normalized) `publicationStatus` + `allowedSurfaces`. Product-specific status vocabularies stay opaque. | `contract/content-document.ts` (TruthSchema) |
| Provenance | `productSnapshotSha` + `evidenceRefs` on every frontmatter. | Same, plus per-file `sourceDigests`. | **ADAPT** | Model as `sourceRepository / sourceSha / sourceAuthority / sourceEvidenceDigest`. Git-backed authority resolves via T0 certified-lineage; unknown SHAs fail closed. | `contract/content-document.ts` (ProvenanceSchema), `composition/provenance-authority.ts` |
| Lifecycle (published/updated/firstPublished/lastReviewed/revision) | Partial (publishedAt/updatedAt/indexingPolicy). | Full lifecycle fields on every insight article. | **ADAPT** | Adopt as normalized `LifecycleSchema` — but strip article-only invariants and keep every field optional except when the producer chooses to declare. | `contract/content-document.ts` (LifecycleSchema) |
| SEO fields (canonical, schemaType, targetQuery, searchIntent, indexingIntent) | Partial. | Present. | **ADAPT** | Represent editorial *intent*; policy decides effective behavior. `SchemaType` remains a producer-declared string (no Article-specific enum in the core). | `contract/content-document.ts` (SeoSchema) |
| CTA intents | Per-registry, article-only. | Same. | **ADAPT** | Model as an opaque `ctaIntentId` + `conversionAllowed`. Copy/destination stays in consumer registries. Policy may deny; never force. | `contract/content-document.ts` (ConversionSchema), `SurfacePolicy.conversion` |
| TOC | — | Derived from Markdown headings by `extractHeadings()`. | **REJECT** *(from the core)* | Presentation concern of the REFERENCE renderer. Not part of the shared engine. | REFERENCE renderer (out of scope for CSE-1) |
| Reading time | — | `readingTimeMinutes()` at 220 wpm. | **REJECT** *(from the core)* | Presentation heuristic; belongs to the renderer. | REFERENCE renderer |
| Article JSON-LD | — | `build-article-graph.ts` (Article/TechArticle/BlogPosting). | **REJECT** *(from the core)* | Article-specific JSON-LD. Core exposes `emitSchemaOrg` + `schemaType`, nothing more. | REFERENCE renderer or NATIVE adapter |
| Related articles | — | `link-graph.ts` producing article-graph relations. | **ADAPT** | Only the identifiers live on the document (`relationships.relatedContentIds`). Graph derivation stays a consumer concern. | `contract/content-document.ts` (RelationshipsSchema) |
| Author card | — | `author-registry` UI. | **REJECT** *(from the core)* | Rendering concern. The document carries `authorIds`; a `SurfacePolicy` decides display. | REFERENCE renderer |
| Breadcrumbs | — | Derived per-article. | **REJECT** *(from the core)* | Navigation concern; policy toggles visibility. | `SurfacePolicy.navigation.showBreadcrumbs` |
| Receipts | Bundle-level (`commit-to-content`). | — | **REJECT** *(from the core)* | Producer receipt semantics, not COMPOSER. | Commit-to-Content / bundle layer |
| Indexability | `indexingPolicy` in frontmatter. | Same. | **ADAPT** | Document expresses *intent*; policy may downgrade (`index` → `noindex`), never upgrade. | `SeoSchema.indexingIntent`, `SurfacePolicy.indexability.allowIndex` |
| SurfacePolicy | Absent. | Absent. | **ADOPT** *(new)* | Generic contract for navigation, author display, conversion, metadata, indexability, analytics. Must not mutate editorial truth. | `contract/surface-policy.ts` |
| ResolvedContentSurface | Absent. | Absent. | **ADOPT** *(new)* | Derived read model; single output of `resolveContentSurface()`. Never a second authoring source. | `contract/resolved-content-surface.ts` |
| Article-derivations helpers | — | `slugifyHeading`, `extractHeadings`, `readingTimeMinutes`, `countWords`. | **REJECT** *(from the core)* | Rendering conveniences, not composition contract. May reappear in the REFERENCE renderer. | REFERENCE renderer |
| Copy safety | — | `copy-safety.ts`. | **REJECT** *(from the core)* | Editorial linting; upstream of the shared engine. | Producer / editorial toolchain |
| Freshness | — | `freshness.ts`. | **REJECT** *(from the core)* | Presentation heuristic. | REFERENCE renderer |
| `editorialClass` / `truthMode` cross-constraints | — | Enforced in Zod superRefine. | **REJECT** *(from the core)* | Product-specific status vocabulary. Stays inside the producer's own contract; carried into COMPOSER only via opaque `sourceStatus`. | Producer (Commit to Content) |

**Rule of construction.** No article-specific concept enters the shared core because the
existing corpus happens to need it. Where a shared concept is defensible (blocks, editorial
identifiers, indexability intent, related-content IDs), we ADAPT to a generic form. Where the
concept is presentation or vocabulary, we REJECT it from the core and leave it to the
REFERENCE renderer or the producer.
