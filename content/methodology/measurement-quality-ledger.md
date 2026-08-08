---
title: "The Measurement Quality Ledger"
description: "The Measurement Quality Ledger exposes coverage, completeness, dispersion, provenance and observability. It contextualises a measurement without scoring it."
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
clusterId: measurement-methodology
ctaVariant: measurement_request
capabilityIds:
  - quality-ledger
  - observe-authority-presence
claimIds:
  - m1-observation-unit
  - m5-not-observable-is-not-zero
  - m6-quality-ledger-contextualises
  - hp1-measurement-doctrine
  - hp2-metric-integrity
visualIds:
  - observability-states-v1
targetQuery: "measurement quality ledger authority presence"
searchIntent: informational
shortAnswer:
  body: "The Measurement Quality Ledger reports how well a measurement is supported: how many observations were eligible, how complete the coverage was, how far results spread, where they came from, and whether each signal was observable. It contextualises the measured result and never merges with it into a score."
  claimIds:
    - m6-quality-ledger-contextualises
---

## What does the Measurement Quality Ledger show?

The Measurement Quality Ledger reports the conditions under which a measurement was taken, so that the measured result can be judged rather than merely read.

A percentage on its own is not evidence. The same 60% can rest on three consistent observations or on fifteen wildly inconsistent ones, and those are not the same claim about a market. The ledger makes that difference visible.

## The dimensions it exposes

**Observation coverage.** How many observations were planned, how many were produced, and how many were eligible for each measure. A measure computed on two eligible observations is labelled as such.

**Completeness.** Whether the declared query panel was actually covered. If part of the panel produced nothing usable, the result describes a smaller panel than the one declared, and the ledger says so.

**Dispersion.** How far per-question results spread around the reported figure. Presence concentrated in one question is a different market fact from presence spread evenly across the panel, even when the overall share is identical.

**Provenance.** Which engine, which surface, which method version and which panel version produced the observations. Without provenance, two figures cannot be compared; with it, they can be compared or explicitly refused.

**Observability status.** For each measure, whether it was observed or not observable. This is what keeps an absence of measurement from being read as a zero, as the page on [why not observable is not zero](/methodology/not-observable-is-not-zero) sets out.

## Why the ledger is not folded into the result

Because folding it in would destroy the information it carries.

To combine dispersion and completeness with a measured share, someone must decide how much volatility should subtract from a result, and by how much thin coverage should discount it. Those weights are judgements, not observations. Embedding them produces a single figure that looks more objective than the measurement it replaced, while hiding the reasoning that shaped it.

TextOS reports the measurement and its conditions separately, and leaves the weighting to whoever is accountable for the decision.

## The ledger is not an Authority Score

The Measurement Quality Ledger does not grade a brand, and it does not produce a composite index. It describes the measurement, not the brand.

There is no Authority Score in TextOS. Quality information exists to make a measurement contestable — to let a reader say *this figure rests on too little* — which is the opposite of what a score is designed to do.

## Limits of comparability

The ledger is also what makes it possible to refuse a comparison. Two measurements should not be placed on the same series when the panel version differs, when the method version differs, when one window is materially less complete than the other, or when a measure was observable in one window and not in the other.

Reporting these conditions is not a caveat added after the fact. It is part of the measurement.

## Related methodology

- [What Authority Presence measures](/methodology/authority-presence) — the observation unit, the versioned panel and the three measures.
- [Direct, Indirect and Total](/methodology/direct-indirect-total) — why Total is a union and never a sum.
