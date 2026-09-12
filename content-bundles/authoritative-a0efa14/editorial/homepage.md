---
surface: homepage
truthLevel: AUTHORITATIVE_MAIN
sourceProductRef: a0efa146a8691938b624c156d99f4663f6f92218
classification: NO_CHANGE
basisCapabilities:
  - observe-authority-presence
basisClaimIds:
  - sales-authority-presence-measurement
  - sales-versioned-authority-measurement
  - sales-authority-presence-boundaries
disclosureAuthority: IMPLICIT_MANIFEST_MARKETABLE
proposedPublishability: REQUIRES_HUMAN_REVIEW
language: en
humanReviewRequired: true
mentionsCommitToContent: false
---

# Homepage — editorial candidate (NO_CHANGE)

**Classification**: `NO_CHANGE`. Reassessed after CTC-6 CTO review.

## Assessment

The current `app/page.tsx` hero and copy are already precise, product-led and English,
grounded in three ratified sales claims:

- `sales-authority-presence-measurement` — "TextOS measures how AI answer engines cite your brand."
- `sales-versioned-authority-measurement` — "TextOS measures a brand's authority presence
  reproducibly, on a versioned query panel, with dispersion and completeness."
- `sales-authority-presence-boundaries` — "TextOS's current Authority Presence measurement is
  not a score and does not include recommendations, ROI estimates, or guarantees of ranking or
  AI citation."

The pipeline previously proposed a defensive replacement. That replacement was **weaker** than
the current homepage: it used defensive framing where the existing kicker+lede is a positive
product statement backed by three PO-ratified claims. Replacing precise English copy with
defensive prose would be a regression.

## Decision

No change is proposed. The homepage remains as it is at `fd40aca`. This candidate records
that the pipeline reassessed the surface at product SHA `a0efa146` and chose not to
manufacture a change where none is warranted.
