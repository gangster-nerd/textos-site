---
title: "What Authority Presence measures"
description: "Authority Presence measures how often AI answer engines cite or name a brand, observed reproducibly on a versioned query panel."
contentType: product_article
language: en
editorialStatus: published
indexingPolicy: noindex
publishedAt: "2026-08-04"
updatedAt: "2026-08-04"
productSnapshotSha: "4d37616453f5d0fed24a8054314d49651e33af6b"
evidenceRefs:
  - "observe-authority-presence:authority-presence-observation-v1"
  - "observe-authority-presence:observe-run-orchestration-v1"
  - "direct-share-of-model:direct-share-measurement-v1"
  - "indirect-mention-share:indirect-mention-measurement-v1"
  - "total-authority-presence:total-presence-composition-v1"
  - "quality-ledger:quality-ledger-rates-v1"
clusterId: measurement-methodology
ctaVariant: measurement_request
capabilityIds:
  - observe-authority-presence
  - direct-share-of-model
  - indirect-mention-share
  - total-authority-presence
  - quality-ledger
claimIds:
  - m1-observation-unit
  - m2-direct-share-of-model
  - m3-indirect-mention-share
  - m4-total-is-a-union
  - m5-not-observable-is-not-zero
  - m6-quality-ledger-contextualises
  - m7-no-recommendations
  - m8-measurement-is-not-verification
  - hp1-measurement-doctrine
  - hp2-metric-integrity
visualIds:
  - authority-presence-union-v1
targetQuery: "what is authority presence"
searchIntent: informational
shortAnswer:
  body: "Authority Presence measures how often AI answer engines cite or name a brand when answering the questions its buyers actually ask. It is observed on a versioned query panel, one answer at a time, and reported as three separate measures with their measurement quality. It is not a score."
  claimIds:
    - m1-observation-unit
    - hp1-measurement-doctrine
---

## What is Authority Presence?

Authority Presence is how often AI answer engines cite or name a brand when they answer the questions that brand's buyers actually ask.

It is not a rank, not a grade and not a composite index. Authority Presence is a set of measurements taken on observed engine answers, reported alongside the conditions under which they were taken.

## The unit of measurement is one answer

TextOS observes one engine answer at a time. Each answer to each query is a separate observation, kept separate through the whole pipeline.

This matters because an answer engine is not deterministic: the same question asked twice can produce different answers, different sources and different brands. A single answer proves very little. A panel of questions, each asked several times, produces a distribution — and a distribution can be measured.

## The versioned query panel

A query panel is the closed, declared list of questions that a measurement covers. It is versioned: every observation records which panel version produced it.

Versioning is what makes two measurements comparable. If the panel changes — a question added, reworded or removed — the panel version changes with it, and measurements taken under different versions are not treated as the same series. A measurement whose question set can drift silently is not a measurement.

## Three separate measures

Authority Presence is reported as three distinct measures, never merged:

- **Direct Share of Model** — the share of eligible observations in which the brand is cited as a source by the engine.
- **Indirect Mention Share** — the share of eligible observations in which the brand is named in the answer text, evaluated independently of citation.
- **Total Authority Presence** — the union of Direct Share of Model and Indirect Mention Share, counted once per observation.

Total Authority Presence is a union and never an arithmetic sum. An answer that both cites a brand as a source and names it in the text belongs to Total exactly once. Adding the two shares would count that answer twice and can exceed one hundred percent, which is why TextOS never adds them.

The dedicated page on [Direct, Indirect and Total](/methodology/direct-indirect-total) defines each measure on its own and works through the overlap case.

## Measurement quality is reported, not folded in

Every measurement carries its own quality information: how many observations supported it, how far they spread, and whether the signal could be observed at all.

Dispersion and completeness contextualise a result. They are never combined with it to produce a single figure. A measurement of sixty percent supported by three consistent observations and one supported by fifteen volatile observations are different facts, and TextOS reports them as different facts.

The [Measurement Quality Ledger](/methodology/measurement-quality-ledger) page describes exactly which quality dimensions are exposed.

## An absence of observation is not a zero

When a signal cannot be observed, TextOS reports it as not observable. It does not record zero.

Zero means the engine answered and the brand was absent — a real, measured result. Not observable means no usable measurement exists, because the engine returned nothing, because the method cannot see that signal, or because coverage was insufficient. Writing zero in place of an absence would invent data.

The page on [why not observable is not zero](/methodology/not-observable-is-not-zero) sets out the four states TextOS distinguishes.

## Is TextOS an Authority Score?

No. TextOS does not produce an Authority Score, and the three measures are never collapsed into one number.

A single score would have to weight direct against indirect presence, decide how much dispersion should penalise a result, and hide those choices inside a figure that looks objective. Those choices belong to whoever reads the measurement, not to the instrument.

## Current limits

An honest method states what it does not do. Today, Authority Presence measurement:

- covers only the questions in the declared panel, and says nothing about questions outside it;
- reports presence, not causation — it does not establish why an engine cited a brand;
- produces no recommendations, no prioritisation and no return-on-investment estimate;
- offers no guarantee of ranking or of future citation, because no method controls an answer engine;
- does not verify whether the statements inside an answer are true. Capture and extraction are separate from verification, as the FAQ on [automatic claim verification](/faq/does-textos-automatically-verify-claims) explains.
