---
title: "Why not observable is never reported as zero"
description: "TextOS distinguishes observed positive, observed zero, not observable and incomplete observation. An absence of measurement is never written as a zero."
contentType: product_article
language: en
editorialStatus: published
indexingPolicy: noindex
publishedAt: "2026-08-04"
updatedAt: "2026-08-04"
productSnapshotSha: "d1b8b50552e1b42768a6bd0c0515675e139780d3"
evidenceRefs:
  - "quality-ledger:quality-ledger-rates-v1"
  - "observe-authority-presence:observe-run-orchestration-v1"
  - "indirect-mention-share:indirect-mention-measurement-v1"
clusterId: measurement-methodology
ctaVariant: measurement_request
capabilityIds:
  - quality-ledger
  - observe-authority-presence
  - indirect-mention-share
claimIds:
  - m1-observation-unit
  - m5-not-observable-is-not-zero
  - m6-quality-ledger-contextualises
  - m3-indirect-mention-share
  - hp2-metric-integrity
visualIds:
  - observability-states-v1
targetQuery: "not observable vs zero measurement"
searchIntent: informational
shortAnswer:
  body: "Observed zero means the engine answered and the brand was absent — a real measurement. Not observable means no usable measurement exists. TextOS reports these as different states, because writing zero in place of an absence would invent data that was never observed."
  claimIds:
    - m5-not-observable-is-not-zero
---

## What does not observable mean?

Not observable means that no usable measurement exists for a signal, on a given observation or over a given window.

It is a statement about the instrument and the material, not about the brand. Nothing was measured, so nothing is reported as a value.

## Four states, kept distinct

TextOS distinguishes four outcomes and never collapses them:

**Observed positive.** The engine answered, the observation was eligible, and the brand was present. A value was measured.

**Observed zero.** The engine answered, the observation was eligible, and the brand was absent. This is also a real measurement: zero is the measured result, and it is informative — the brand could have appeared and did not.

**Not observable.** No measurement exists. The engine returned no answer surface, or the method cannot see that signal at all, or nothing eligible was captured. There is no result to report, positive or zero.

**Incomplete observation.** Some observations exist, but too few to report a stable figure. A result is withheld or explicitly marked as weakly supported rather than presented as if it were solid.

## Why observed zero and not observable must not be merged

Because they answer different questions.

Observed zero answers: *the engine spoke, and did the brand appear?* — No. That is a fact about the market.

Not observable answers: *did we obtain anything to look at?* — No. That is a fact about the measurement.

Merging them produces a number that looks like market evidence but is really an instrument failure. A brand told it has 0% presence will act on it; a brand told the signal is not observable will ask why, and that is the correct next question.

## Where not observable comes from

Not observable is not a single product defect, and it is not always a limitation of TextOS. It arises from several distinct situations:

- **The source.** The engine returned no answer surface for that query, so there was nothing to observe.
- **The answer.** The answer existed but carried no eligible material — for example no cited sources at all.
- **The method.** The measurement method cannot expose that dimension. Indirect Mention Share, for instance, is not observable under a collection method that returns cited URLs without the surrounding answer text.
- **Coverage.** Too few eligible observations were gathered over the window to report anything.

Each of these is reported as not observable, and the measurement quality information says which kind of gap it was.

## An example

A weekly measurement covers five questions, each asked three times. Twelve of the fifteen observations are eligible; the other three returned no answer surface at all. Direct Share of Model is observed on those twelve and comes out at 25%. Indirect Mention Share cannot be computed at all, because the collection method captured citation lists without answer text.

The honest report is: Direct Share of Model 25%, Indirect Mention Share not observable, Total Authority Presence not observable as a union.

The dishonest report is: Direct 25%, Indirect 0%, Total 25%. It reads as though indirect presence had been measured and found to be nil. Nothing of the sort was measured.

## What this implies for comparison

Two measurements are only comparable when they were observed under the same conditions. A window in which a signal was not observable cannot be placed on the same line as a window in which it was measured, and a change from not observable to a measured value is not an improvement — it is a change of visibility.

## Related methodology

- [What Authority Presence measures](/methodology/authority-presence) — the observation unit and what the three measures cover.
- [The Measurement Quality Ledger](/methodology/measurement-quality-ledger) — where observability status and completeness are exposed.
