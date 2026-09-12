---
surface: methodology
truthLevel: AUTHORITATIVE_MAIN
sourceProductRef: a0efa146a8691938b624c156d99f4663f6f92218
classification: NO_CHANGE
basisCapabilities:
  - observe-authority-presence
  - direct-share-of-model
  - indirect-mention-share
  - total-authority-presence
  - quality-ledger
basisClaimIds:
  - m2-direct-share-of-model
  - m3-indirect-mention-share
  - m4-total-is-a-union
  - m5-not-observable-is-not-zero
  - m6-quality-ledger-contextualises
disclosureAuthority: IMPLICIT_MANIFEST_MARKETABLE
proposedPublishability: REQUIRES_HUMAN_REVIEW
language: en
humanReviewRequired: true
mentionsCommitToContent: false
---

# Methodology — editorial candidate (NO_CHANGE)

**Classification**: `NO_CHANGE`. Coverage is complete at product SHA `a0efa146`.

## Existing coverage

Four methodology articles exist:

- `authority-presence`
- `direct-indirect-total`
- `measurement-quality-ledger`
- `not-observable-is-not-zero`

## Why NO_CHANGE

1. The pinned product manifest (`d1b8b50`) is byte-identical to product main (`a0efa146`).
2. Each authoritative capability is already covered.
3. R2 read-models remain `internal_only` — cannot back a public methodology article.
4. Manufacturing a change without a manifest basis would violate CTC doctrine.

## What would trigger a change

- A new capability promoted to `public_marketable`.
- A doctrinal ADR that renders an existing article inaccurate.

Neither has occurred.
