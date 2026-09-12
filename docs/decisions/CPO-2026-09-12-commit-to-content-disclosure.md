# CPO decision — Commit to Content disclosure authority

- **Decision date**: 2026-09-12
- **Owner**: CPO
- **Scope**: textos-site editorial governance
- **Reference id**: `CPO-2026-09-12-commit-to-content-disclosure`

## Statement

Commit to Content, the internal pipeline that turns verified product development
and GitHub history into governed marketing content, is:

- `storyKind = COMPANY_TECHNOLOGY` — a company/technology story, not a TextOS
  product capability.
- `publicMaturity = INTERNAL_LABS` — terminally capped. Promotion to any
  commercial maturity (`PUBLIC_ROADMAP`, `PUBLIC_EARLY_ACCESS`, `PUBLIC_BETA`,
  `PUBLIC_GA`) requires a separate CPO decision AND a requalification to
  `storyKind = PRODUCT_CAPABILITY` with product-manifest governance.

## Authorized disclosure surface

Restricted to editorial contexts framed as **technology, methodology or
how-we-build storytelling**. Examples: a blog post about internal tooling,
an engineering conference talk, a documentation appendix about content
governance.

## Explicitly NOT authorized by this decision

- Creation of a public `/labs`, `/products`, `/features` or equivalent route
  for Commit to Content.
- Any customer-availability, sign-up, contact-us-for-access, waitlist or
  commercial CTA.
- Any implication that Commit to Content is a TextOS product feature.
- Any pricing, SLA, integration promise or roadmap commitment for external
  buyers.

## CTA

`cta = "none"`. No commercial call-to-action of any kind.

## Evidence

Implementation lives entirely in this repository under:

- `lib/commit-to-content/**`
- `scripts/content-{sync,verify,status}.ts`
- `docs/commit-to-content-v1.md`
- `docs/commit-to-content-labs.md`

Dogfooding across other codebases (TextOS, ShortsOS, RepOS) is a stated
motivation but the dogfooding integrations themselves are outside this
repository and outside the scope of this disclosure.

## Requirements before any future promotion

1. Explicit new CPO decision superseding this one, with a new dated record.
2. Requalification `storyKind = PRODUCT_CAPABILITY`.
3. Corresponding entry added to the authoritative TextOS product capability
   manifest with a supported `publicationStatus`.
4. Re-import of the manifest per `product-manifest/IMPORT.md`.
5. Review by PO of the new commercial candidates produced by the pipeline.

## Machine-consumable reference

`lib/commit-to-content/maturity-declarations.ts` — entry
`capabilityId: "commit-to-content"` MUST carry
`disclosureDecisionRef: "docs/decisions/CPO-2026-09-12-commit-to-content-disclosure.md"`.
