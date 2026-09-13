# Content Surface Engine — CSE-1 contract

Signed COMPOSER topology:

```
Content producers                (Commit to Content, TextOS Act, …)
        │
        ▼
ContentDocument (content-document@1)
        │
        ▼
Content Surface Engine
   resolveContentSurface(ContentDocument, SurfacePolicy)
        │
        ▼
ResolvedContentSurface (resolved-content-surface@1)
        ├── REFERENCE  → ReferenceRenderer            (not implemented in CSE-1)
        └── NATIVE     → NativeAdapter → NativeCompositionPlan (frozen)
```

## Boundaries

- **Authentication, tenancy, autonomous access** are orchestration concerns outside the
  producer / engine boundary.
- **Publication status boundary.** The engine interprets ONLY `truth.publicationStatus` and
  `truth.allowedSurfaces`. Product-specific `statusVocabulary`,
  `statusVocabularyVersion` and `sourceStatus` remain opaque and are carried through for
  audit only.
- **Provenance boundary.** Git-backed authority resolves against
  `content/certified-lineage.json` — the T0 certified lineage. Unknown Git SHAs fail closed.
  Non-Git producers (e.g. TextOS Act) leave `sourceSha` undefined and identify evidence via
  `sourceEvidenceDigest`.
- **Native freeze.** `AssetSpec`, `NativeCompositionPlan`, Gutenberg / Elementor grammars,
  the `NativeAdapter`, and `publishArticleAction` are untouched by CSE-1. The core is
  designed so a NATIVE surface can consume `ResolvedContentSurface` without forcing a second
  parser or an incompatible representation later.

## Purity guarantees

`resolveContentSurface` is pure and deterministic:

- no React, no Next.js, no CMS SDK
- no filesystem or network access
- no HTML parsing, no second authoring source
- no mutation of `ContentDocument` or `SurfacePolicy`
- no editorial-truth inference (a policy that appears to change what the document says is a
  bug)

## What CSE-1 explicitly does NOT deliver

- No public article route.
- No Article renderer implementation.
- No migration of the 12 existing insight articles.
- No NATIVE implementation.
- No producer wiring (Commit to Content and TextOS Act stay upstream of the contract).

## Modules

- `lib/content-surface-engine/contract/**` — `ContentDocument`, `SurfacePolicy`,
  `ResolvedContentSurface` schemas and types.
- `lib/content-surface-engine/composition/**` — `resolveContentSurface`,
  `resolveSourceAuthority` (fail-closed lineage guard).
- `lib/content-surface-engine/conformance/**` — article + non-article fixtures used only by
  tests.
- `content/certified-lineage.json` — T0 certified product SHAs. Read-only for builders after
  CSE-1.
