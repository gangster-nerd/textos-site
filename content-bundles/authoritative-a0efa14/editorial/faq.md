---
surface: faq
truthLevel: AUTHORITATIVE_MAIN
sourceProductRef: a0efa146a8691938b624c156d99f4663f6f92218
classification: CONTENT_COVERAGE_GAP
basisCapabilities:
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

# FAQ — editorial candidate

**Classification**: `CONTENT_COVERAGE_GAP`. Two new FAQ entries proposed, each bound to
authoritative claims already ratified for the `faq` surface.

## Existing entry (unchanged)

`does-textos-automatically-verify-claims` — remains accurate.

## Proposed entry 1

**slug**: `what-is-the-difference-between-direct-and-indirect-share`

**title**: What is the difference between Direct Share of Model and Indirect Mention Share?

**body (proposed, verbatim quotes bound to m2/m3)**:

> **Direct Share of Model** is the share of eligible observations in which the tracked entity
> is cited as a source by the answer engine.
>
> **Indirect Mention Share** is the share of eligible observations in which the tracked
> entity is named inside the answer text. It is evaluated independently of whether the
> entity is also cited as a source.
>
> The two answer different questions. TextOS reports them separately. When TextOS exposes a
> composite, that composite is **Total Authority Presence**: the union of direct and indirect
> presence, counted once per observation. It is never the arithmetic sum of Direct Share of
> Model and Indirect Mention Share.

**bindings**:
- `m2-direct-share-of-model` (statement above is the ratified statement, verbatim)
- `m3-indirect-mention-share` (statement above is the ratified statement, verbatim)
- `m4-total-is-a-union` (statement above is the ratified statement, verbatim)

## Proposed entry 2

**slug**: `what-does-the-quality-ledger-tell-me`

**title**: What does the Quality Ledger tell me about a measurement?

**body (proposed, bound to m5 + m6)**:

> Every TextOS measurement carries a Quality Ledger. Coverage, completeness, dispersion,
> provenance and observability **contextualise** the measurement; they are not combined into the measured result.
> A missing observation is never recorded as a measured zero: absence of evidence is not
> evidence of absence, and the ledger surfaces which panel queries produced no observation
> rather than silently folding them in.

**bindings**:
- `m5-not-observable-is-not-zero` (a non-observation is not a zero)
- `m6-quality-ledger-contextualises` (the ledger contextualises, does not combine)

## Prohibited wording

- "detects every mention of the brand"
- "guarantees measurement accuracy"
- "measures every answer a model can produce"
- "tracks brand visibility in real time"
- activation phrasing that implies unassisted onboarding while eligibility is false
- any mention of the internal editorial-engineering pipeline

## Decision basis

m2, m3, m4, m6 all carry `faq` in `allowedSurfaces`. The four backing capabilities are
`public_marketable` at the pinned manifest. No promotion required to publish these entries.
