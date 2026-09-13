---
title: The three dimensions of Authority Presence
description: Authority Presence is not one score. TextOS reports Direct Share of Model, Indirect Mention Share, and Total Authority Presence as three separate measures.
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
primaryTopicId: measurement-mechanics
topicIds:
- measurement-mechanics
- authority-observation
audience: reader-technical
funnelStage: consideration
productSnapshotSha: d1b8b50552e1b42768a6bd0c0515675e139780d3
evidenceRefs:
- direct-share-of-model:direct-share-measurement-v1
- indirect-mention-share:indirect-mention-measurement-v1
- total-authority-presence:total-presence-composition-v1
- quality-ledger:quality-ledger-rates-v1
- observe-authority-presence:authority-presence-observation-v1
clusterId: measurement-methodology
ctaVariant: measurement_request
capabilityIds:
- direct-share-of-model
- indirect-mention-share
- observe-authority-presence
- quality-ledger
- total-authority-presence
claimIds:
- m1-observation-unit
- m2-direct-share-of-model
- m3-indirect-mention-share
- m4-total-is-a-union
- m5-not-observable-is-not-zero
- hp2-metric-integrity
targetQuery: three measures of authority presence
searchIntent: informational
shortAnswer:
  body: TextOS reports Authority Presence as three separate measures. Direct Share of Model counts observations where the tracked entity is cited as a source. Indirect Mention Share counts observations where a third-party citation names the entity. Total Authority Presence is the union of the two, counted once per observation.
  claimIds:
  - m2-direct-share-of-model
  - m3-indirect-mention-share
  - m4-total-is-a-union
editorialClass: ARCHITECTURE_DECISION
truthMode: DOCUMENTARY
sourcePaths:
- docs/adr/ADR-011-authority-presence-estimation.md
sourceSemantics: ACCEPTED_ADR
sourceDigests:
  docs/adr/ADR-011-authority-presence-estimation.md: a3af72d4b0405d993532fb408690d2e5d46724a7c8bfcc759fac60e566a33b82
---

## An architectural decision, not a display choice

A dashboard that shows "Authority: 62" hides an architectural choice. Somewhere in the code, someone decided how to weight what the engine cited as a source against what the engine merely named in a sentence, then folded the answer into a single number. That choice is invisible to the reader, unreproducible from the outside, and unstable the day the weighting changes.

TextOS makes the opposite decision. Authority Presence is expressed as three separate measures, and their separation is enforced at the estimator layer — not at the chart layer. The architecture record ADR-011 states the constraint plainly: three measures are computed, each with its own numerator, its own coverage flag, and its own dispersion. There is no composite "authority score" produced anywhere in the system, and the same document names such a score an anti-objective.

This article explains what the three measures are, why they must remain separate, and what that separation buys the reader.

## What the three measures observe

Every measurement in TextOS starts from a single unit: one engine answer to one query, at one moment, on one surface. Each answer is kept as a separate observation, versioned by the method that produced it. On top of those observations, three questions are asked independently.

**Direct Share of Model** asks: in what share of eligible observations is the tracked entity cited as a source? Cited as a source means the engine attributes part of its answer to the entity — typically by linking to or naming one of the entity's own canonical domains among its references. It is a citation *by* the engine *of* the entity.

**Indirect Mention Share** asks: in what share of eligible observations is the tracked entity named through a third party? A guide, a directory or a media outlet is cited by the engine, and that source names the entity in the passage the engine used. The engine did not credit the entity. It credited someone else who talked about the entity. That is a different signal.

**Total Authority Presence** asks: in what share of eligible observations is the entity present at all, directly or indirectly? It is the union of the first two — counted once per observation, never twice. An answer that both cites the entity as a source and names it in the prose is one observation, and it belongs to Total exactly once.

## Why the union is not a sum

The temptation is arithmetic. Direct Share of Model is 40%, Indirect Mention Share is 50%, therefore Authority is 90%. That number is wrong every time an observation carries both a direct citation and an indirect mention of the same entity — which is common, because an engine can plausibly link to a brand's own site and mention it in the same sentence.

ADR-011 spells out the rule: Total is the union by observation, not the sum by citation. An observation containing both a direct citation and an indirect mention of the entity is counted **once** in Total. The estimator computes it that way, and the oracle fixture that governs the calculation deliberately includes such an observation, precisely so that the code cannot silently drift back into `direct + indirect` addition.

The article on [Direct, Indirect and Total Authority Presence](/methodology/direct-indirect-total) works through the overlap arithmetic with a ten-observation example. The important point here is architectural: Total is a set operation, and the code that computes it cannot be replaced by a sum without breaking a test.

## Why the measures must be reported separately

Fusing Direct and Indirect into a single number destroys information that no downstream reader can recover.

A high Direct with a low Indirect describes a brand that engines treat as a reference. Its own pages are used as sources; the brand is credited by name in the citation list. A low Direct with a high Indirect describes a brand that is part of the conversation without being credited. Reviewers, aggregators and media outlets carry its name into engine answers, but the engines cite those third parties, not the brand itself. These are different market positions, and different problems.

A single composite figure would rank them as equivalent. The measurement doctrine — carried by claim `hp2-metric-integrity` — refuses that equivalence: Direct, Indirect and Total are separate measures. Total Authority Presence is the union of direct and indirect presence, never their sum.

## When a measure cannot be observed

Not every method can see every signal. Some engines return a list of cited sources but no snippet of the passages that used them; from such a response, direct citations can be extracted, indirect mentions cannot. ADR-011 turns that limit into an explicit output: when the method of the run does not produce the `indirect_mention` signal, Indirect Mention Share is reported as *not observable*, not as zero.

The distinction is load-bearing. Zero means the method looked for the signal and found none — a real observation. Not observable means the method cannot look for it — the absence of a measurement, not a measurement of absence. Recording one as the other invents data.

Total Authority Presence carries this honesty through. When Indirect is not observable, Total reports what direct citations alone establish, tagged as a floor — at least this much presence — not as the definitive total. That floor is useful; a fake ceiling would not be.

The commitment appears in claim `m5-not-observable-is-not-zero` and in the methodology page on [why not observable is not zero](/methodology/not-observable-is-not-zero).

## Every measure names its entity

There is no such thing as "the brand's Share of Model" without an entity. Panels track multiple entities — a brand, its competitors, sometimes a category term — and every measure carries the identifier of the entity it is about. ADR-011 makes this explicit: measures are computed *per tracked entity*, never for the panel as a whole.

The filter that decides whether a citation counts for an entity is the entity match, not the flag that says "this citation belongs to a tracked entity somewhere". The two would coincide most of the time; the entity match is the one that survives edge cases, and the estimator uses it by design.

## What each measure carries around it

A single number is easy to compare and easy to misread. Each measure is therefore reported alongside its numerator and denominator (exposed as integers, not hidden inside the ratio), a **per-query breakdown** — three hits out of five executions of one query says something about instability, three hits across five different queries says something about coverage, and a single average would flatten the two — and a **dispersion** summary of minimum, maximum, mean and standard deviation across queries.

None of this is a statistical model yet. ADR-011 calls the design *variance-ready*, not variance-aware: the structure carries the dimensions a later confidence-interval model will need, without pretending to produce those intervals today. Total additionally carries a coverage flag that records which of the two component signals actually contributed — enforcing at the data layer that a direct-only floor cannot be presented as a definitive total.

## What this decision buys

Three separate measures cost more to display than one. They also do three things a composite score cannot.

They **stay defensible when the method evolves**. Direct extraction and indirect extraction can improve at different times, on different engines. Each measure keeps its own version markers, and a series that breaks on one signal does not silently corrupt the other two.

They **stay honest when a signal is missing**. Not observable is a first-class state; Total tells the reader whether it is a full union or a direct-only floor.

And they **stay actionable**. Direct and Indirect describe different mechanisms — being cited as a reference, versus being carried by third parties. A reader who wants to act on the measurement can see which lever the observations point to. A single number would have removed that distinction to spare a chart column.

The three measures are not three views on the same result. They are three results on the same set of observations, and TextOS reports them as such.

## Related methodology

- [What Authority Presence measures](/methodology/authority-presence) — the observation unit and the versioned query panel that all three measures rest on.
- [Direct, Indirect and Total Authority Presence](/methodology/direct-indirect-total) — a worked example of the union arithmetic.
