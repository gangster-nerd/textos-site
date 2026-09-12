---
surface: labs (editorial target — NOT a public route)
truthLevel: AUTHORITATIVE_MAIN
sourceProductRef: a0efa146a8691938b624c156d99f4663f6f92218
classification: LABS_MATURITY_CHANGE
capabilityId: commit-to-content
storyKind: COMPANY_TECHNOLOGY
publicMaturity: INTERNAL_LABS
disclosureAuthority: CPO_DISCLOSURE_APPROVED
disclosureDecisionRef: docs/decisions/CPO-2026-09-12-commit-to-content-disclosure.md
proposedPublishability: REQUIRES_HUMAN_REVIEW
cta: none
appliesToPublicRoute: false
---

# Commit to Content — technology story candidate

**Restricted candidate** — this candidate is authorized ONLY for a technology / methodology /
how-we-build editorial context (e.g. an engineering blog post, a documentation appendix, a
conference talk). It is NOT authorized for any customer-facing surface, /labs page or
commercial CTA. See `docs/decisions/CPO-2026-09-12-commit-to-content-disclosure.md`.

## Proposed body (restricted-disclosure)

> **How we govern content changes at TextOS**
>
> Behind our public pages sits an internal system called Commit to Content. It reads verified
> product development history — capability declarations, ADRs, GitHub commits — and turns
> each governed increment into a versioned bundle of editorial candidates.
>
> Every candidate carries its provenance: which product SHA it comes from, which capability
> declaration it relies on, which manifest snapshot backs it. Deterministic gates verify that
> nothing on our site claims capability the product cannot back. Nothing publishes without a
> human review.
>
> Commit to Content is a piece of internal tooling, not a TextOS customer feature. It happens
> to be dogfooded across TextOS, ShortsOS and RepOS internally. We are writing about it as an
> engineering practice, not selling it. There is no waitlist and no CTA — this is how we
> build, not what we sell.

## Explicit disclaimers to include when published

- Ne PAS présenter comme une capacité TextOS.
- Ne PAS proposer de sign-up, waitlist, contact-for-access.
- Ne PAS suggérer une disponibilité future automatique.
- Ne PAS promettre un SLA, tarif, ou intégration.

## Bounds enforced by pipeline

- `storyKind = COMPANY_TECHNOLOGY` (schema-refused si combiné avec une maturité commerciale).
- `publicMaturity = INTERNAL_LABS` (terminalement plafonnée).
- `cta = none` (schema-refused si autre).
- `disclosureAuthority = CPO_DISCLOSURE_APPROVED` avec `disclosureDecisionRef` pointant sur
  un fichier réel du dépôt (`docs/decisions/CPO-2026-09-12-commit-to-content-disclosure.md`).

## What this candidate does NOT do

- N'ouvre PAS de route `/labs`.
- N'ajoute PAS Commit to Content au `PUBLIC_SURFACES` du site.
- N'annonce PAS d'accès client, ni Beta, ni Early Access.
- N'implique PAS que ShortsOS / RepOS ont un statut public.

Toute promotion commerciale exige une nouvelle décision CPO ET une requalification
`storyKind = PRODUCT_CAPABILITY` avec gouvernance manifeste. Ce candidat sera régénéré par le
pipeline à chaque `content:sync` — son texte est préservé (bundle.ts snapshotEditorial).
