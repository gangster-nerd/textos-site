---
title: Opportunity Brief — Deterministic Assembly from Evidence
description: 'The Opportunity Brief is a deterministic, mechanically assembled artefact: no LLM, no ROI estimate, no priority score — only observations and citations.'
contentType: product_article
language: en
editorialStatus: draft
indexingPolicy: noindex
publishedAt: '2026-09-12'
updatedAt: '2026-09-12'
authorId: textos-editorial-team
reviewerIds:
- marc-p
firstPublishedAt: null
lastReviewedAt: '2026-09-13'
revisionNumber: 0
schemaType: TechArticle
primaryTopicId: opportunity-and-decision
topicIds:
- opportunity-and-decision
audience: reader-technical
funnelStage: consideration
productSnapshotSha: d1b8b50552e1b42768a6bd0c0515675e139780d3
evidenceRefs:
- observe-authority-presence:observe-run-orchestration-v1
- quality-ledger:quality-ledger-rates-v1
clusterId: product-engineering
ctaVariant: measurement_request
capabilityIds:
- observe-authority-presence
- quality-ledger
claimIds:
- m1-observation-unit
- m7-no-recommendations
- m8-measurement-is-not-verification
- hp1-measurement-doctrine
targetQuery: textos opportunity brief deterministic architecture
searchIntent: technical
shortAnswer:
  body: An Opportunity Brief in TextOS is designed to be assembled mechanically from a typed authority gap and its observed evidence. No LLM writes it. It templates a factual objective, cites the exact observations that support it, and remains a proposal — human acceptance is the only path forward.
  claimIds:
  - m1-observation-unit
  - m7-no-recommendations
editorialClass: ARCHITECTURE_DECISION
truthMode: DOCUMENTARY
sourcePaths:
- docs/adr/ADR-014-opportunity-brief.md
sourceSemantics: ACCEPTED_ADR
sourceDigests:
  docs/adr/ADR-014-opportunity-brief.md: f2b012b26bfe6726776bee6d038c492d1f8b1584337ddf83ee4849180a66020d
---

## An architecture note, not an availability claim

This article documents an architectural decision inside TextOS. The Opportunity Brief mechanism is implemented, but it is not, at this snapshot, a customer-facing feature: the capability registry keeps it as an internal capacity. What follows describes **how the brief is designed to be assembled** and **why the design refuses shortcuts** — not what a buyer can expect to receive today.

## The problem the brief is designed to solve

Once TextOS accumulates observations, the natural next step for most tools would be a "recommendation": here is what to write, here is where to invest, here is a priority score. TextOS declines that step, on purpose. A recommendation is not an observation, and once a system starts recommending, its authority slides from "we measured this" to "we think this" — a slide the rest of the architecture has been designed to prevent.

The Opportunity Brief is the joint between what the observatory saw and what a human might choose to do about it. Its design constraint follows: the brief must **carry evidence forward without adding judgment**. The judgment belongs to the human at acceptance time.

## What the brief is, mechanically

ADR-014 fixes the shape. A Proposed Opportunity Brief contains a gap identifier, a templated objective, the covered questions, the missing claim types, the cited sources, an evidence array that recopies competing subject mentions with their evidence spans, and a plan skeleton — a list of claim types to cover, not prose. Its status at birth is always `proposed`. Its `effect_metric` is `null` (there is no effect to measure before a publication has been made and re-observed).

Every one of those fields is filled from data the earlier layers already produced. The objective is a **template** parameterised by the gap type, the tracked entity and the missing claim types. The evidence copies the actual sentence-level spans surfaced by the extractor. The plan is a schema of claim types to cover, not a paragraph. Nothing in the assembly asks a language model to produce, phrase or interpret.

## Why deterministic — and why explicitly no LLM

The earlier layers (extraction, gap typing) are deterministic and oracle-first. If the brief were assembled by an LLM, the deterministic lineage would break at exactly the moment it matters most: the moment where an operator has to decide whether an opportunity is real. A brief assembled mechanically is **reproducible, traceable and defendable**. Two runs on the same inputs produce the same brief. The evidence cited is the evidence observed, character for character. There is no drift between "what the model said the observations meant" and "what the observations were".

Writing prose — a real editorial angle, a real narrative — is a later, separate concern. That concern belongs to a subsequent layer, behind an isolated transport (the same pattern the observatory uses for engine access). Advancing an LLM into the brief itself would blur the frontier between judging what is defendable and writing about it. ADR-014 refuses to blur that frontier.

## Defendability is a mechanical property

Not every observed gap becomes a brief. ADR-014 fixes a defendability rule with no discretionary weights: a gap qualifies as a defendable opportunity if, and only if, (a) its type is not `signal_unavailable` — no observed matter, no opportunity; (b) there is **actionable observed material**, meaning at least one competing subject with an evidence span, and (for claim gaps and competitor displacement gaps) at least one missing claim type; for absence gaps, the absent entity plus at least one third party carrying claims suffices; (c) source-only gaps are not produced in V0 and therefore cannot originate a brief in V0.

That rule is not a heuristic in a prompt. It is a specification. It is validated against an oracle before any code ships. The exact rule and its edge cases are frozen sprint by sprint, not evolved by a model at inference time.

There is a stronger consequence hidden in that rule: **the brief mechanism must also know how to say nothing**. An oracle for the mechanism explicitly requires at least one gap that is deliberately not retained — proof that the design abstains. A system that always produces briefs would fail its own oracle; the abstention is part of the specification.

## Only retained gaps are persisted

An earlier layer types gaps but does not persist them. ADR-014 chooses the persistence moment carefully: **retention materialises**. Only gaps kept as defendable are written to the store; the ones set aside are not. The reasoning is symmetrical to the append-only rule of [the observatory](/insights/observatory-not-cms): the record should reflect what was retained, not what was considered and dropped.

The persisted brief is bound to its gap by a proper foreign key. The gap's typed characteristics — its type, its missing claim types, its severity hint — are carried into the record so that later re-reading remains typed. Severity is a **mechanical hint** produced upstream; it is not turned into a score at persistence, and no economic priority is attached to it.

## The gate — human acceptance is the only path forward

A brief is born `proposed`. The transition to `accepted` or `rejected` is **only** performed by a human. Accepted briefs are terminal: they do not re-transition. Rejected briefs are terminal in the other direction. Generation of any downstream content is gated on acceptance — this is a non-negotiable rule in the specification, and it is enforced structurally (a downstream content draft always carries a non-null pointer to a brief).

The metric that governs the whole layer is measured on **accepted** briefs. That choice is deliberate. Counting proposals would reward volume; counting acceptances rewards the joint outcome of the mechanism (proposing something defendable) and the operator (recognising it as defendable). Neither party alone can inflate the number.

## What the brief refuses to do

ADR-014 documents a long list of refusals, and each one is a hedge against a specific failure mode.

The brief does not accept itself. Automating acceptance would collapse the joint the mechanism was built to enforce.

The brief does not write content. The `objective` is a factual template, not an editorial angle; the `plan` is a schema of claim types, not prose. That work belongs to a later, isolated layer.

The brief does not use an LLM anywhere in its own path. It is a determinstic assembler.

The brief does not publish. It does not set a published timestamp or a publication policy state.

The brief does not estimate ROI. It does not attach a monetary or growth priority. It does not compare runs to synthesise a trend. It does not compute a composite score.

The brief does not persist what it rejected. Only retained gaps are materialised.

Each refusal is a load-bearing part of the mechanism. Together they define what "defendable" is allowed to mean inside TextOS: exactly the material the observations support, and nothing more. This is the same discipline the public methodology captures when it says [an Authority Presence measurement does not produce recommendations](/methodology/authority-presence): the measurement layer refuses recommendations, and the layer above it refuses the shortcut of turning observations into instructions.

## Why this design matters even before the brief is public

The brief mechanism sits behind an internal boundary today. That does not make its design private in intent. It matters because it defines **what TextOS is willing to build on top of an observation**. A measurement-first product that then let an LLM synthesise "opportunities" from those measurements would be a measurement-flavoured content factory. Deterministic assembly, evidence carry-through, and the human gate are what keep the product from becoming that thing.

Read alongside the [observatory architecture](/insights/observatory-not-cms) — which fixes the observation as the first-class citizen — ADR-014 fixes the second-class citizen: not a synthetic recommendation, not a scored priority, but a **proposal** whose entire content is either fact from the observation record or a template that names the fact clearly.

## Related methodology

- [Why TextOS Is an Observatory, Not a CMS](/insights/observatory-not-cms) — the architectural context in which the brief sits.
- [What Authority Presence measures](/methodology/authority-presence) — the measurement layer whose observations feed the brief.
- [The Measurement Quality Ledger](/methodology/measurement-quality-ledger) — how the conditions of measurement are carried, contextualising the evidence any brief cites.
