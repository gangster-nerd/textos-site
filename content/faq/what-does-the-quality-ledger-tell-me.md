---
title: "What does the Quality Ledger tell me about a measurement?"
description: "The Quality Ledger contextualises the measurement — coverage, completeness and observability — without folding them into the measured result."
contentType: faq_entry
language: en
editorialStatus: published
indexingPolicy: noindex
publishedAt: "2026-09-12"
updatedAt: "2026-09-12"
productSnapshotSha: "d1b8b50552e1b42768a6bd0c0515675e139780d3"
evidenceRefs:
  - "quality-ledger:quality-ledger-rates-v1"
capabilityIds:
  - quality-ledger
claimIds:
  - m5-not-observable-is-not-zero
  - m6-quality-ledger-contextualises
clusterId: measurement-methodology
ctaVariant: measurement_request
targetQuery: "what does the quality ledger tell me"
searchIntent: informational
shortAnswer:
  body: "The Quality Ledger reports coverage, completeness, dispersion, provenance and observability alongside every measurement. These contextualise the measurement; they are not combined into the measured result. A missing observation is never recorded as a measured zero."
  claimIds:
    - m5-not-observable-is-not-zero
    - m6-quality-ledger-contextualises
---

## What does the Quality Ledger surface?

The Quality Ledger reports **coverage, completeness, dispersion, provenance and observability** alongside every measurement TextOS produces. Each dimension surfaces one facet of how observable the panel actually was for that run.

## Why are these not folded into the measured value?

The ledger **contextualises** the measurement; it is not combined into the measured result. Combining coverage or completeness into the measured value would confuse two different questions — what was observed, and how completely it was observed — and would hide the boundary between them.

## What happens to queries that returned no observation?

**A missing observation is never recorded as a measured zero.** Absence of evidence is not evidence of absence. The ledger surfaces which panel queries produced no observation rather than silently folding them into the composed value; the composed value acknowledges the missing bucket instead of rounding it in.

## How should a reader use the ledger?

A reader should read the measured values and the ledger together. The ledger tells the reader how much of the panel was observable for that run, how the observations were distributed, and what evidence supports the reported values. If coverage or completeness is low, the measurement is still what TextOS observed — the ledger simply says so.
