---
title: Authority Intelligence, Not AI SEO
description: TextOS measures why answer engines cite or ignore a brand. It is an authority intelligence system, not an AI SEO writer.
contentType: product_article
language: en
editorialStatus: draft
indexingPolicy: noindex
publishedAt: '2026-09-12'
updatedAt: '2026-09-12'
productSnapshotSha: d1b8b50552e1b42768a6bd0c0515675e139780d3
evidenceRefs:
- observe-authority-presence:authority-presence-observation-v1
- direct-share-of-model:direct-share-measurement-v1
- indirect-mention-share:indirect-mention-measurement-v1
- total-authority-presence:total-presence-composition-v1
- quality-ledger:quality-ledger-rates-v1
capabilityIds:
- direct-share-of-model
- indirect-mention-share
- observe-authority-presence
- quality-ledger
- total-authority-presence
claimIds:
- hp1-measurement-doctrine
- hp2-metric-integrity
- m1-observation-unit
- m7-no-recommendations
- m8-measurement-is-not-verification
clusterId: measurement-trust
ctaVariant: none
targetQuery: authority intelligence versus ai seo
searchIntent: informational
shortAnswer:
  body: TextOS is an authority intelligence system, not an AI SEO tool. It measures how answer engines cite or name a brand on a versioned query panel, reports three separate measures with their measurement quality, and produces no rankings, no scores, and no optimisation recommendations.
  claimIds:
  - hp1-measurement-doctrine
  - hp2-metric-integrity
  - m7-no-recommendations
editorialClass: PRODUCT_PRINCIPLE
truthMode: PROSPECTIVE
sourcePaths:
- docs/product/PRODUCT-VISION-TEXTOS.md
sourceSemantics: ROADMAP_DIRECTION
sourceDigests:
  docs/product/PRODUCT-VISION-TEXTOS.md: 5ddb2768a0d34b06e42fc1bed3f4ab37f915e741bd2aaaf760e150fbef8e3330
disclaimer: Direction under exploration — not a delivery commitment.
---

> Direction under exploration — not a delivery commitment.

## The category is wrong before the tool is even chosen

The label "AI SEO" carries a promise TextOS refuses to make. AI SEO tools optimise: they take a brand, a page, a topic, and return a graded output — a score to raise, a suggestion to apply, a checklist to close. That grammar was built for a search-result world in which a rank could be moved by an act. Answer engines do not work that way. They synthesise. They cite. They name. And they do all of it non-deterministically, on surfaces whose rules are not published and whose behaviour changes between two identical prompts.

We chose a different frame. TextOS is an **authority intelligence system**: an observatory whose purpose is to describe, faithfully and reproducibly, how answer engines treat a brand in the questions its buyers ask. The observation itself is the product. Everything else — briefs, actions, publications — is downstream of a measurement we can defend.

## Measurement, not scoring

TextOS measures authority presence reproducibly on a versioned query panel, with dispersion and completeness. It is not a score. It is a measurement.

That distinction sounds pedantic. It is not. A score compresses several judgements into a single number: how much direct citation counts against indirect mention, how much dispersion should penalise a result, how much coverage matters relative to signal. Those judgements belong to whoever reads the number, not to the instrument that produced it. A score hides them; a measurement exposes them.

The unit is the answer, not the brand. TextOS observes one engine answer at a time, on a versioned query panel, and keeps each observation separate through the entire pipeline. The observation, not the brand, is the unit of measurement. A single answer proves very little — answer engines are not deterministic, and the same question asked twice can produce different citations. What can be measured is a distribution over a declared panel, taken repeatedly under identifiable conditions.

We report three separate measures, never one composite score:

- **Direct Share of Model** — the share of eligible observations in which the tracked entity is cited as a source by the engine.
- **Indirect Mention Share** — the share of eligible observations in which the entity is named in the answer text, evaluated independently of citation.
- **Total Authority Presence** — the union of direct and indirect presence, counted once per observation, never their arithmetic sum.

The methodology page on [Direct, Indirect and Total](/methodology/direct-indirect-total) works through the overlap arithmetic. The reason to keep three measures apart is not statistical purity for its own sake — it is that "your brand is cited as a source" and "a source cited by the engine mentions your brand" describe two genuinely different market positions. Fusing them into a single "authority score" would erase the distinction and pretend a decision has been made when it has not.

## What is filled — and what is not

The existing category has learned to answer one question well: *what is visible?* Citations, mentions, gaps against a competitive set — those are legitimate observations and tools like Profound, Peec, Otterly and Surfer's AI tracker produce them. The unresolved question is the next one: *why?* And, after that: *what should change?*

TextOS positions itself on the second terrain. Not because we claim to open the black box of a language model — we do not, and any product that promises to is overselling. The tractable question is narrower and more defensible: what observable pattern distinguishes the sources answer engines cite from the sources they ignore? That is corroborative work on the sources themselves, not causal work on the model. It is observable, it is verifiable, and it is actionable in a way a "confidence-weighted causal cause" is not.

An authority presence measurement reports observed presence. It does not produce recommendations, automatic prioritisation, return-on-investment estimates, or guarantees of ranking or citation. Those are decisions, and decisions belong to the reader of the measurement.

## What TextOS refuses to promise

A short list, because promises are how categories mislead their markets:

- No authority score. Three measures, always separate, always reported alongside their measurement quality.
- No causal claim about why a language model decided anything. The tractable claim is about patterns on the sources it cites.
- No prediction of what a publication will do to the numbers. That would require an intervention-to-citation dataset we do not have on day one; building it honestly is a downstream product concern, not a launch promise.
- No verification of the truth of the statements engines produce. An authority presence measurement reports what answer engines say about a brand. It does not establish why an engine cited a brand, and it does not verify whether the statements inside an answer are true. The FAQ on [automatic claim verification](/faq/does-textos-automatically-verify-claims) sets out that boundary.
- No ranking guarantee. No product controls an answer engine.

None of these refusals weakens the offer. They constitute it. A measurement one can defend in front of a technical buyer — panel versioned, observations independent, method versioned, dispersion reported, absence distinguished from zero — is worth substantially more than a score one has to explain away.

## The shape of the promise

The customer of an authority intelligence system is not buying articles. They are buying a defensible view of a market they cannot otherwise see: who answer engines treat as a reference on the questions their buyers ask, where their own brand sits in that landscape, and on which surfaces the picture changes. The product succeeds when a decision-maker can look at the measurement and act on it — or decide not to — with the same confidence they would give a survey whose methodology they trust.

That is what "authority intelligence" names. It is not a slogan against AI SEO; it is a different category of instrument. The one produces suggestions. The other produces evidence. The gap between "we scored your page 78" and "on this versioned panel, on these surfaces, in this window, your brand is cited in 12% of eligible observations, named in 27%, absent in the rest, with the following dispersion" is the gap TextOS exists to close.

## Related reading

- [What Authority Presence measures](/methodology/authority-presence) — the observation unit and the versioned query panel.
- [Direct, Indirect and Total Authority Presence](/methodology/direct-indirect-total) — the three measures and why they are never summed.
- [Does TextOS automatically verify claims?](/faq/does-textos-automatically-verify-claims) — the boundary between measurement and verification.
