---
title: "Difference between Direct Share of Model and Indirect Mention Share?"
description: "Direct counts observations where the brand is cited as a source. Indirect counts observations where the brand is named in the answer text."
contentType: faq_entry
language: en
editorialStatus: published
indexingPolicy: noindex
publishedAt: "2026-09-12"
updatedAt: "2026-09-12"
productSnapshotSha: "d1b8b50552e1b42768a6bd0c0515675e139780d3"
evidenceRefs:
  - "direct-share-of-model:direct-share-measurement-v1"
  - "indirect-mention-share:indirect-mention-measurement-v1"
  - "total-authority-presence:total-presence-composition-v1"
capabilityIds:
  - direct-share-of-model
  - indirect-mention-share
  - total-authority-presence
claimIds:
  - m2-direct-share-of-model
  - m3-indirect-mention-share
  - m4-total-is-a-union
clusterId: measurement-methodology
ctaVariant: measurement_request
targetQuery: "direct share of model vs indirect mention share"
searchIntent: informational
shortAnswer:
  body: "Direct Share of Model is the share of eligible observations in which the tracked entity is cited as a source by the answer engine. Indirect Mention Share is the share of eligible observations in which the tracked entity is named inside the answer text, independently of citation. The two are reported separately and never added."
  claimIds:
    - m2-direct-share-of-model
    - m3-indirect-mention-share
---

## What does Direct Share of Model count?

**Direct Share of Model is the share of eligible observations in which the tracked entity is cited as a source by the answer engine.** It measures citation as source: the answer engine names the entity in its citation list for that answer.

## What does Indirect Mention Share count?

**Indirect Mention Share is the share of eligible observations in which the tracked entity is named inside the answer text.** It is evaluated independently of whether the entity is also cited as a source. Indirect and Direct answer different questions and are measured against the same panel of observations, but they are not the same event.

## Why does TextOS never add them?

The two measures observe distinct phenomena. Adding them would double-count observations in which the entity appears both as a cited source and inside the answer text, and it would misrepresent observations that carry only one of the two. TextOS reports each measure separately.

## What is Total Authority Presence, then?

**Total Authority Presence is the union of direct and indirect presence, counted once per observation. It is never the arithmetic sum of Direct Share of Model and Indirect Mention Share.** When TextOS exposes a composite, that composite is Total Authority Presence and it carries its composition rule. A single "brand visibility" number would collapse two distinct observations.

## What can a reader safely conclude?

A reader can read Direct as citation-as-source and Indirect as named-in-answer, on the same versioned query panel. A reader should not treat their sum as a total; the total exposed by TextOS is the union, not the sum.
