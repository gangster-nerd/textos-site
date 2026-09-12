---
surface: labs
truthLevel: AUTHORITATIVE_MAIN
sourceProductRef: a0efa146a8691938b624c156d99f4663f6f92218
classification: LABS_MATURITY_CHANGE
capabilityId: commit-to-content
storyKind: COMPANY_TECHNOLOGY
publicMaturity: INTERNAL_LABS
basisCapabilities: []
basisClaimIds: []
implementationEvidence:
  - textos-site/lib/commit-to-content/sync.ts
  - textos-site/lib/commit-to-content/publishability.ts
  - textos-site/lib/commit-to-content/promotion-requests.ts
  - textos-site/lib/commit-to-content/editorial-verifier.ts
  - textos-site/lib/commit-to-content/editorial-registrar.ts
  - textos-site/lib/commit-to-content/editorial-frontmatter.ts
  - textos-site/scripts/content-sync.ts
  - textos-site/scripts/content-verify.ts
  - textos-site/scripts/content-status.ts
disclosureAuthority: CPO_DISCLOSURE_APPROVED
disclosureDecisionRef: docs/decisions/CPO-2026-09-12-commit-to-content-disclosure.md
proposedPublishability: REQUIRES_HUMAN_REVIEW
cta: none
appliesToPublicRoute: false
language: en
humanReviewRequired: true
---

# Commit to Content — technology story candidate (restricted)

**Restricted candidate.** Authorized only for a technology / methodology / how-we-build
editorial context. Not authorized for any customer-facing surface, no `/labs` route, no
commercial CTA. See `docs/decisions/CPO-2026-09-12-commit-to-content-disclosure.md`.

## Proposed body (restricted-disclosure, English)

> **How we govern content changes at TextOS**
>
> Behind our public pages sits an internal system we call Commit to Content. It reads
> verified product development history — capability declarations, ADRs, GitHub commits —
> and turns each governed increment into a versioned bundle of editorial candidates.
>
> Every candidate carries its provenance: which product SHA it comes from, which capability
> declaration it relies on, which manifest snapshot backs it. Deterministic gates verify
> that nothing on our site claims capability the product cannot back. Nothing publishes
> without a human review.
>
> Commit to Content is a piece of internal tooling, not a TextOS customer feature. Today
> it is implemented for TextOS and dogfooded on this site's editorial governance. We
> intend to reuse it next for ShortsOS and RepOS; those industrializations have not yet
> been demonstrated. We are writing about this as an engineering practice, not selling it.
> There is no waitlist and no CTA — this is how we build, not what we sell.

## Truthful cross-product state (CTC-6 correction)

- **TextOS**: implemented and dogfooded (this repository).
- **ShortsOS**: intended next industrialization — not yet demonstrated.
- **RepOS**: intended next industrialization — not yet demonstrated.

Do NOT present it as already reused across the three products at the same time.

## Disclaimers to include when published

- Do NOT present as a TextOS capability.
- Do NOT propose sign-up, waitlist, or contact-for-access.
- Do NOT suggest future customer availability automatically.
- Do NOT promise SLA, pricing, or integration.

## Bounds enforced by the pipeline

- `storyKind = COMPANY_TECHNOLOGY` (schema rejects any commercial maturity).
- `publicMaturity = INTERNAL_LABS` (terminally capped).
- `cta = none` (schema rejects any other value).
- `disclosureAuthority = CPO_DISCLOSURE_APPROVED` with `disclosureDecisionRef` pointing at
  a real file under `docs/decisions/` (validated at load).

## What this candidate does NOT do

- Does NOT open a `/labs` route.
- Does NOT add `commit-to-content` to `PUBLIC_SURFACES`.
- Does NOT announce customer access, Beta, or Early Access.
- Does NOT imply ShortsOS or RepOS have public status.
