# CMO × CTO decision — Product-thinking editorial disclosure

- **Decision date**: 2026-09-12
- **Owner**: CMO (co-signed CTO)
- **Scope**: textos-site editorial platform
- **Reference id**: `CMO-2026-09-12-product-thinking-disclosure`

## Statement

TextOS authorizes public editorial disclosure of the following editorial
classes, on the site's `/insights` surfaces:

- **Product principles** — the reasoning behind TextOS's product doctrine.
- **Architecture decisions** — ADR-backed technical decisions we take, with
  the trade-offs they carry.
- **Engineering notes** — how we build the product; concrete engineering
  practices with implementation evidence.
- **Experiments** — bounded work whose outcome is not committed.
- **Retrospectives** — what we learned from shipped or abandoned work.
- **Roadmap directions** — directions we are exploring; **never** delivery
  commitments.
- **Company technology stories** — internal systems (like the Commit-to-Content
  pipeline itself) that we can talk about without selling them.

## Explicitly NOT authorized

This decision does **not** authorize any claim of product **availability**.

Availability claims remain governed by the TextOS product capability manifest
and its `public_marketable` status. No editorial article authorized by this
decision may state or imply:

- customers can use / are using / activate / connect / integrate;
- the capability is available now, in beta, in early access;
- production readiness, self-service, SLA, pricing, integration guarantees;
- future customer availability by default (roadmap directions must carry the
  explicit non-commitment framing below).

`ROADMAP_DIRECTION` articles must carry, verbatim:

> Direction under exploration — not a delivery commitment.

`EXPERIMENT` and `COMPANY_TECHNOLOGY` articles must use `cta: none`.

## Editorial classification

Every article, brief and content-impact record on the site must declare an
`editorialClass` in `{ CURRENT_CAPABILITY, PRODUCT_PRINCIPLE,
ARCHITECTURE_DECISION, ENGINEERING_NOTE, EXPERIMENT, ROADMAP_DIRECTION,
RETROSPECTIVE, COMPANY_TECHNOLOGY }`.

**Only `CURRENT_CAPABILITY` is governed as an availability claim.** The other
seven classes may be published as thought leadership when:

1. authoritative evidence exists (ADR, implementation, or change record read
   from the accepted product SHA);
2. the disclosure is approved by this decision or a more specific one;
3. no prohibited availability wording is present (deterministic gate).

## Sourcing rule

Every editorial artefact must carry:

- `sourceProductRef` — the accepted product SHA
- `sourcePaths` — files read from that SHA
- `sourceSemantics` — one of `ACCEPTED_ADR`, `IMPLEMENTATION_EVIDENCE`,
  `VERIFIED_CHANGE_RECORD`, `HISTORICAL_SPRINT_INTENT`, `ROADMAP_DIRECTION`,
  `GOVERNANCE_DECISION`
- `truthMode` — one of `AUTHORITATIVE`, `DOCUMENTARY`, `PROSPECTIVE`
- `sourceDigests` — sha256 of the source path contents at the SHA where
  practical

Reading from unmerged branches, forks, or working-tree state is prohibited.

## Redaction

Every article must be redacted of:
- customer / prospect names
- personal data
- credentials, secrets, unpatched vulnerabilities
- pricing / contract terms
- unapproved commitments (SLA, integration promises, dates)

## Public surface

Publication happens on the site's `/insights` surface (and existing surfaces
where already governed). This decision does **not** add `insights` or `labs`
to the product-manifest `PUBLIC_SURFACES` vocabulary; those remain the site
governance boundary.

## Reclassification of the CTC-8 opportunities

Consistent with this decision:

- **Commit to Content** — how we build. `COMPANY_TECHNOLOGY / INTERNAL_LABS /
  cta:none`. Publication approved (this is the first exemplar).
- **Opportunity Brief** and **Repos Intersection** — public thinking approved
  as `COMPANY_TECHNOLOGY / cta:none`. No availability claim.
- **WordPress publisher**, **Native Composition (Gutenberg)**, **AssetSpec**,
  **GEO Writer**, **Owned-surface Design**, **Query Intelligence** —
  architecture / research articles allowed as `ARCHITECTURE_DECISION` or
  `ENGINEERING_NOTE`. Capability **availability** remains gated by the product
  manifest.

## Requirements before availability communication

Any capability-availability communication (BETA / EARLY_ACCESS / GA / customer
self-serve) still requires:

1. Product-manifest promotion to the corresponding `publicationStatus`.
2. Explicit availability-communication decision (separate from this one).
3. Corresponding candidate produced by the Commit-to-Content pipeline and
   reviewed under CTC governance.

This decision only opens the **editorial** channel. It does not open the
**availability** channel.
