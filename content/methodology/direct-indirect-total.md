---
title: "Direct, Indirect and Total Authority Presence"
description: "Direct Share of Model, Indirect Mention Share and Total Authority Presence are three separate measures. Total is their union, never their sum."
contentType: product_article
language: en
editorialStatus: published
indexingPolicy: noindex
publishedAt: "2026-08-04"
updatedAt: "2026-08-04"
productSnapshotSha: "d1b8b50552e1b42768a6bd0c0515675e139780d3"
evidenceRefs:
  - "direct-share-of-model:direct-share-measurement-v1"
  - "indirect-mention-share:indirect-mention-measurement-v1"
  - "total-authority-presence:total-presence-composition-v1"
  - "observe-authority-presence:authority-presence-observation-v1"
clusterId: measurement-methodology
ctaVariant: measurement_request
capabilityIds:
  - direct-share-of-model
  - indirect-mention-share
  - total-authority-presence
  - observe-authority-presence
claimIds:
  - m1-observation-unit
  - m2-direct-share-of-model
  - m3-indirect-mention-share
  - m4-total-is-a-union
  - hp2-metric-integrity
visualIds:
  - authority-presence-union-v1
targetQuery: "direct share of model vs indirect mention share"
searchIntent: informational
shortAnswer:
  body: "Direct Share of Model counts observations where the brand is cited as a source. Indirect Mention Share counts observations where the brand is named in the answer text, independently of citation. Total Authority Presence is the union of the two, counted once per observation, and is never their arithmetic sum."
  claimIds:
    - m2-direct-share-of-model
    - m3-indirect-mention-share
    - m4-total-is-a-union
---

## What is Direct Share of Model?

Direct Share of Model is the share of eligible observations in which the tracked brand is cited as a source by the answer engine.

Cited as a source means the engine attributes part of its answer to the brand — typically by linking or naming one of the brand's own domains among its references. Direct Share of Model is computed per observation: an answer either cites the brand as a source or it does not.

## What is Indirect Mention Share?

Indirect Mention Share is the share of eligible observations in which the tracked brand is named inside the answer text.

The brand appears in the engine's prose — recommended, compared, described. Indirect Mention Share is evaluated independently of Direct Share of Model: it asks only whether the brand was named, not whether it was also credited as a source. An observation can therefore satisfy both criteria.

Indirect Mention Share and Direct Share of Model measure different things and are never averaged or exchanged for one another. A brand can be widely named and rarely cited, or the reverse, and those are genuinely different market positions.

## What is Total Authority Presence?

Total Authority Presence is the share of eligible observations in which the brand is present at all — cited as a source, or named in the answer, or both.

It is the union of direct and indirect presence, evaluated once per observation. It is never their arithmetic sum.

## Why is Total not Direct plus Indirect?

Because a single answer can be in both sets at once, and adding the two shares would count that answer twice.

An engine can cite a brand's own documentation as a source *and* name the brand in the sentence it writes. That observation is direct and indirect simultaneously. It belongs to Total once.

Consider ten eligible observations:

- the brand is cited as a source in four of them — Direct Share of Model is 40%;
- the brand is named in the answer text in five of them — Indirect Mention Share is 50%;
- two observations are in both sets.

Total Authority Presence is the count of distinct observations where the brand appears at all: 4 + 5 − 2 = 7, so 70%. The arithmetic sum would give 90%, which no observation supports. With enough overlap, a sum can exceed 100% — a figure that cannot describe a share of observations.

Total Authority Presence is therefore always at least as large as the larger of the two measures, and never larger than their sum.

## Reading the three measures together

The three measures are reported side by side, never merged into one figure. Read together they describe a shape rather than a level:

- high Direct and low Indirect — engines treat the brand as a reference, but rarely bring it into the answer;
- low Direct and high Indirect — the brand is part of the conversation while other sources are credited;
- both low — the brand is largely outside the answers its buyers receive.

None of these readings is a recommendation. TextOS measures presence; deciding what to do about it is editorial and commercial work that belongs to the reader.

## Related methodology

- [What Authority Presence measures](/methodology/authority-presence) — the observation unit and the versioned query panel.
- [Why not observable is not zero](/methodology/not-observable-is-not-zero) — how the absence of a measurement is reported, and why it is not a 0% share.
