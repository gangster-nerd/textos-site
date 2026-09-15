---
title: Three measures, never one score
description: Fusing citations and mentions into one authority score hides the difference between being cited and being talked about. TextOS refuses the fusion.
contentType: product_article
language: en
editorialStatus: draft
indexingPolicy: noindex
publishedAt: '2026-09-12'
updatedAt: '2026-09-12'
authorId: textos-editorial-team
reviewerIds: []
firstPublishedAt: null
lastReviewedAt: null
revisionNumber: 0
schemaType: Article
image:
  src: /og/insights/three-measures-never-one-score.svg
  alt: Three measures, never one score — TextOS Insight
  width: 1200
  height: 630
primaryTopicId: measurement-mechanics
topicIds:
- measurement-mechanics
- product-doctrine
audience: reader-mixed
funnelStage: consideration
productSnapshotSha: d1b8b50552e1b42768a6bd0c0515675e139780d3
evidenceRefs:
- direct-share-of-model:direct-share-measurement-v1
- indirect-mention-share:indirect-mention-measurement-v1
- total-authority-presence:total-presence-composition-v1
- quality-ledger:quality-ledger-rates-v1
- observe-authority-presence:authority-presence-observation-v1
clusterId: measurement-trust
ctaVariant: measurement_request
capabilityIds:
- direct-share-of-model
- indirect-mention-share
- observe-authority-presence
- quality-ledger
- total-authority-presence
claimIds:
- m2-direct-share-of-model
- m3-indirect-mention-share
- m4-total-is-a-union
- m5-not-observable-is-not-zero
- m6-quality-ledger-contextualises
- m7-no-recommendations
- hp1-measurement-doctrine
- hp2-metric-integrity
targetQuery: why textos does not have an authority score
searchIntent: informational
shortAnswer:
  body: A composite authority score would confuse being cited as a source with being named by a third party, would hide the choice of weightings behind an opaque number, and would silently redefine measurements when the method evolves. TextOS treats a single score as an anti-objective and reports three measures separately.
  claimIds:
  - m4-total-is-a-union
  - hp1-measurement-doctrine
  - hp2-metric-integrity
editorialClass: PRODUCT_PRINCIPLE
truthMode: DOCUMENTARY
sourcePaths:
- docs/adr/ADR-001-observatory-architecture.md
- docs/adr/ADR-011-authority-presence-estimation.md
sourceSemantics: ACCEPTED_ADR
sourceDigests:
  docs/adr/ADR-001-observatory-architecture.md: 7547b6467a494440409b2788d07e27456ceafa8d2c4f3af529e8463cdc2c0fac
  docs/adr/ADR-011-authority-presence-estimation.md: a3af72d4b0405d993532fb408690d2e5d46724a7c8bfcc759fac60e566a33b82
---

## An anti-objective, named explicitly

Most measurement products end in a number. The dashboard headline is a score; the score is the promise; the score is what a buyer remembers. TextOS ends somewhere else, and that difference is not an oversight. It is a design decision, taken twice: once in the observatory architecture (ADR-001), and again in the authority-presence estimator (ADR-011). Both documents use the same phrase — *anti-objective* — to describe a single composite score, and both instruct the code that computes measurements to refuse the fusion at the source.

This article explains what the fusion would silently do, why it would be strategically wrong even when it is technically clean, and what TextOS reports instead.

<!-- cta:contextual -->

## The three questions a composite score conflates

TextOS observes engine answers one at a time and asks three separate questions of each observation. The questions are described at length in the piece on [Direct, Indirect and Total Authority Presence](/methodology/direct-indirect-total). In short:

- **Direct Share of Model** counts observations in which the tracked entity is cited *as a source* by the engine.
- **Indirect Mention Share** counts observations in which the tracked entity is *named through a third party* — a media outlet or guide is cited by the engine, and that citation talks about the entity.
- **Total Authority Presence** counts observations in which the entity is present at all, direct or indirect, once per observation.

Direct and Indirect are two different mechanisms of authority. Direct says the engine treats the entity's own materials as reference material. Indirect says the entity is part of the conversation that reference materials carry. A high Direct with a low Indirect is a very different market position from a low Direct with a high Indirect — and both are different again from an entity that is present through both channels.

A composite score would collapse those three positions into one number and choose, silently, how much each dimension mattered. The reader would see the same 62 for two entities that look nothing alike.

## The union is not a sum

Even if a reader accepted the collapse in principle, the arithmetic of the collapse would still be wrong. ADR-011 makes the constraint explicit: Total Authority Presence is the **union** of direct and indirect presence, evaluated once per observation. It is never their sum.

The reason is that a single answer can satisfy both criteria at once. An engine can cite an entity's own documentation *and* name the entity in the sentence it writes. That answer is one observation. If Direct Share of Model is 40% and Indirect Mention Share is 50% and 20% of observations are in both sets, Total is 40 + 50 − 20 = 70%, not 90%. Sums exceed 100% as overlap grows, and no observation supports a share above 100%.

The estimator's oracle fixture — the frozen test case that governs the calculation — deliberately contains an observation with a direct citation and an indirect mention of the same entity. Without that case, the code would drift back into addition over time and pass tests that only cover disjoint sets. The fixture is what makes the union enforceable.

Claim `m4-total-is-a-union` states the rule in the public methodology, and claim `hp2-metric-integrity` restates it in the public doctrine: Direct, Indirect and Total are separate measures. Total is the union, never the sum.

## Two different signals, two different capabilities

The estimator does more than compute a union. It carries a coverage flag that records **which** of the two signals contributed. Direct is available whenever the method can extract citations from the engine response. Indirect is available only when the method exposes the passages of text where third-party sources named the entity — which some providers do not do.

A single composite score would have no way to represent this asymmetry. It would either invent a value where none exists — pretending Indirect is 0% when the method never looked — or refuse to compute the whole score whenever any component was missing.

ADR-011 chooses a third path: when the method cannot produce the indirect signal, Indirect Mention Share is reported as *not observable*, and Total is reported as equal to Direct with a coverage flag marking it a **floor**. At least this much presence exists; a fuller total might exist and would raise the number, never lower it.

This is what claim `m5-not-observable-is-not-zero` protects. Zero is a measured absence — a signal the method looked for and did not find. Not observable is a structural absence — a signal the method cannot produce. A composite score turns both into the same digit, and the reader cannot tell which one is on their screen.

## What measurement quality would disappear inside a score

Behind every share, TextOS carries a small set of quality facts: the number of eligible observations that produced the number, the dispersion of the number across queries in the panel, the completeness of the run that supplied the observations, the method version that measured them. These are not decorations — claim `m6-quality-ledger-contextualises` describes them as the context that keeps a result readable.

A composite score would have to fold all of that into one figure. Sixty percent supported by three consistent observations and sixty percent supported by fifteen volatile observations are the same score and very different facts. ADR-001 raises this concern directly and lists three quality rates — run completion, share-of-model eligibility, answer-surface trigger — that must be reported alongside the measurement, not baked into it. A drop in completion, for instance, would show up in a composite score as a drop in authority. It would be nothing of the kind.

Dispersion tells a similar story. ADR-011 defines a per-query view of every measure — how many observations came from each query, and how the share varies across the panel — precisely because a single averaged score cannot distinguish "three hits on the same query five times" from "three hits spread over five different queries". One is instability on an intention; the other is partial coverage of a market. A single number can be either.

## Method versions and the illusion of continuity

The observatory architecture adds a third argument against a composite score, one that appears only over time. Provider access, citation extraction, aggregation and canonicalisation all evolve, and ADR-001 requires each to be versioned; the four versions combine into a `measurement_method_version` that identifies the exact method by which a number was produced. Two measurements are directly comparable only if that method version matches, and a change in method creates a break in the series, marked explicitly.

A composite score would carry the break silently. When the method changed, the number would either shift for reasons unrelated to the market or be re-baselined without the reader noticing. Reporting three measures separately does not eliminate this problem, but it isolates it: a change to the indirect extractor breaks the Indirect series and leaves Direct alone. A composite would smear the break across all of them.

## What TextOS reports instead

The alternative is what the [methodology page on Authority Presence](/methodology/authority-presence) already describes: three measures reported side by side, each with its numerator and denominator, its per-query view, its dispersion, its coverage flag, and the quality rates of the run that produced it. Claim `hp1-measurement-doctrine` gives the short form of the promise: TextOS measures authority presence reproducibly on a versioned query panel, with dispersion and completeness. Not a score. A measurement.

A reader who wants to compress the picture to one number can still do so — averaging by hand, weighting one signal over the other — and that choice will be theirs, exposed, contestable. The instrument does not make it for them.

## What refusing a score does not mean

Refusing a single score is not a refusal of clarity. The three measures are readable side by side; the [methodology worked example](/methodology/direct-indirect-total) shows how the shape of the three tells a story a single number cannot. And it is not a refusal to compute a union: Total Authority Presence *is* a summary, but a summary that names what it does — a count of observations in which the entity is present at all — and preserves the direct and indirect components alongside itself.

What it is, is a refusal to hide choices. Weighting direct against indirect is a choice. Deciding how much dispersion should discount a result is a choice. Deciding whether a not-observable signal counts as zero is a choice. A composite score would make all of those choices, silently, on behalf of the reader. TextOS surfaces them, so that the reader can make them or refuse to make them, and so that the instrument does not stand in for the judgment that only the reader can supply.

## Related methodology

- [What Authority Presence measures](/methodology/authority-presence) — the observation unit, the panel and the three measures reported together.
- [Direct, Indirect and Total Authority Presence](/methodology/direct-indirect-total) — a worked example of the union arithmetic and why sums fail.
