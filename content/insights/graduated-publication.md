---
title: Graduated Publication — Supervised, Trusted, Locked-Back
description: How TextOS publishes accepted, truth-checked drafts under a graduated trust regime — and traces effect as a descriptive delta, never a causal claim.
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
schemaType: TechArticle
image:
  src: /og/insights/graduated-publication.svg
  alt: Graduated Publication — Supervised, Trusted, Locked-Back — TextOS Insight
  width: 1200
  height: 630
primaryTopicId: generation-and-publication
topicIds:
- generation-and-publication
- quality-ledger-and-provenance
audience: reader-technical
funnelStage: consideration
productSnapshotSha: d1b8b50552e1b42768a6bd0c0515675e139780d3
evidenceRefs:
- quality-ledger:quality-ledger-rates-v1
- observe-authority-presence:authority-presence-observation-v1
capabilityIds:
- observe-authority-presence
- quality-ledger
claimIds:
- hp1-measurement-doctrine
- hp2-metric-integrity
- m5-not-observable-is-not-zero
- m7-no-recommendations
- m8-measurement-is-not-verification
clusterId: measurement-methodology
ctaVariant: measurement_request
targetQuery: how does textos publish content safely
searchIntent: informational
shortAnswer:
  body: 'Publication moves through three modes — supervised (default), trusted (after a threshold of clean validations), and locked-back (forced return on incident). Two gates never lift: acceptance to a validated brief, and truth-check. Effect is reported as a descriptive delta between runs, never as a causal claim.'
  claimIds:
  - hp1-measurement-doctrine
  - m5-not-observable-is-not-zero
  - m8-measurement-is-not-verification
editorialClass: ARCHITECTURE_DECISION
truthMode: DOCUMENTARY
sourcePaths:
- docs/adr/ADR-016-graduated-publication.md
sourceSemantics: ACCEPTED_ADR
sourceDigests:
  docs/adr/ADR-016-graduated-publication.md: 59cfe81ea63f94f1b14ff27eae9494511879635527b41719c3be0c82e676493b
---

## Publication is the moment the system meets a live surface

A measurement system stays honest as long as it only observes. It becomes exposed the instant it publishes. Every content pipeline that sits above answer engines eventually confronts the same question: at what point does a draft leave human hands? Content farms answer immediately, en masse, and eat their own credibility. Fully-supervised pipelines answer never, and stop scaling. TextOS answers with a third option — a **graduated publication regime** governed by an explicit machine and two gates that never lift.

The regime is written in ADR-016 as an accepted architecture decision. This article documents that decision. It is not a promise of availability; both `controlled-preview` and `generation-handoff` are marked `internal_only` in the capability registry today, which means they exist as governed engineering surfaces, not as customer-facing features. What follows is the shape of the boundary we chose, not the shape of a shipped product.

<!-- cta:contextual -->

## Three modes, one deterministic machine

Publication moves between three modes, each of which is a state in a pure, deterministic machine:

- **`supervised`** — the default. Every draft receives explicit human review before it is published. The review is not advisory; it is a gate. Nothing bypasses it.
- **`trusted`** — the systematic review is *lifted* on a defined scope after a threshold of clean validations. A "clean validation" is a published draft that was not modified by a human between generation and publication. The default threshold is one hundred. Below it, a scope stays in `supervised`.
- **`locked_back`** — forced return to review. Triggered automatically on incident. From `locked_back`, clean validations can climb back toward `trusted`; nothing about the graduation is one-way.

The state transitions are pure. They read observable counters (`clean_validations_count`, `threshold`, `last_incident_at`, `scope`), they emit a next state, they persist that decision. There is no informal judgement inside the machine, no "let's grant trust for this run", no reviewer who can nudge a scope forward. The rise from `supervised` to `trusted` is exactly the arithmetic; the return to `locked_back` is exactly the incident signal.

Two consequences follow. First, the graduation is **auditable**: an operator can point to the exact counter and the exact threshold that caused a state transition, and can reproduce it. Second, the graduation is **scoped**: `supervised → trusted` is granted on a defined perimeter, not globally. The perimeter is a JSON descriptor that the policy carries alongside the counter. A newly opened topic or vertical starts at zero, regardless of what an adjacent scope has earned.

## Two gates that never lift — even in `trusted`

Modes govern the *review* layer. They govern nothing else. Two gates operate underneath and remain in force whatever the mode says:

- **The brief-backing gate.** A draft may be published only if it is bound to an `OpportunityBrief` in state `accepted`. A draft that references no brief, or references a `proposed`/`rejected` brief, cannot be published — not manually, not automatically, not in `trusted`.
- **The truth-check gate.** A draft that carries a `TruthCheck = block` verdict is refused. The verdict travels with the draft; the publisher reads it before any surface is touched. `trusted` mode has no privilege here. A blocked draft in `trusted` is exactly as unpublishable as a blocked draft in `supervised`.

The doctrinal reason is written into the architecture: the graduation exists to remove the *human review step* on a controlled perimeter, and nothing else. It does not grant permission to publish weaker drafts, or to skip verification, or to lower the bar of what "acceptable" means. When the machine is doing well, the human is doing less inspection — not looser inspection.

Sampled a-posteriori review persists in `trusted`. A sample of what has been auto-published keeps being read by a human; when the sample surfaces drift, the scope moves to `locked_back` automatically. Trust is a running observation, not a granted title.

## Effect as descriptive delta — the first inter-run comparison, and only for effect

Publication is inseparable from the question every operator asks next: *did it change anything?* Answering that question requires comparing presence measurements taken before and after — that is, comparing two runs. Elsewhere in the pipeline, inter-run comparison is explicitly forbidden: measurements from separate runs are not directly comparable because engines are non-deterministic and the same panel executed twice yields different distributions. That rule stands.

ADR-016 amends the rule, narrowly and explicitly, only for effect tracing. A pure function computes:

```
computeEffect(before, after) = {
  presenceBefore, presenceAfter,
  delta = after − before,
  descriptor: "direct presence moved from X% to Y%"
}
```

The descriptor is deliberately flat. It reports a movement associated with a publication window. It does not assert that the publication caused the movement. It cannot. Answer engines change for a thousand reasons — a model version, a corpus refresh, a competitor moving, a seasonal drift, a random rerouting on the vendor's side. What the observation supports is a delta correlated with a window. What it does not support is a claim of cause.

This is the same discipline the measurement layer already carries: when a signal is not observable, we say so, and we do not record a measured zero. Here, when an effect is a delta and not a proof, we say delta and we do not record a cause. The word "descriptive" in this article is doing that work. It is not softness. It is the shape of what the data actually supports.

## What graduated publication does not do

A short list, because the boundary matters:

- It does not generate anything. Generation lives one step earlier in the pipeline; publication receives a `truthchecked` draft, it does not author one.
- It does not enrich sources of evidence. That belongs to a downstream layer.
- It does not compare runs for anything other than effect. The inter-run door is opened for one purpose and closed to every other use.
- It does not touch the observation boundary. The measurement engine and its provider transport are unchanged.
- It does not affirm causality. Delta is the ceiling; cause is off-limits.

The design bet is that a graduated regime with two unliftable gates is more honest than a fully-automated pipeline that pretends to be careful, and more scalable than a fully-manual regime that pretends to be exhaustive. It also makes the measurement layer look sharper by contrast: because publication reports a delta rather than a cause, the measurement it draws from does not have to answer questions it was never designed to answer.

## Why we are documenting this now

ADR-016 is an accepted architecture decision. The corresponding capabilities are implemented and held in `internal_only` — meaning: the engineering exists, the boundary is described, and the product does not yet expose it publicly. Documenting the decision without exposing the surface is deliberate. It lets the shape of the boundary be criticised, contested and refined before a customer-facing surface hardens around it.

We want the criticism. If you measure content operations, if you have opinions about how publication should be governed, or if you have run into the graduation-versus-manual trade-off in your own pipelines, we would like to hear how our regime looks from the outside — and where you would push back.

## Related reading

- [What Authority Presence measures](/methodology/authority-presence) — the observation unit that publication ultimately affects.
- [Not observable is not zero](/methodology/not-observable-is-not-zero) — the doctrine that shapes how we treat delta and absence.
- [The Measurement Quality Ledger](/methodology/measurement-quality-ledger) — how observation quality is exposed alongside every measurement.
