---
title: No affirmation without evidence
description: TextOS never lets a draft affirm what the evidence does not support. A deterministic TruthCheck blocks any contradiction, and no draft ships without proof.
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
schemaType: Article
primaryTopicId: claim-evidence-and-truth-check
topicIds:
- claim-evidence-and-truth-check
- generation-and-publication
audience: reader-mixed
funnelStage: consideration
productSnapshotSha: d1b8b50552e1b42768a6bd0c0515675e139780d3
evidenceRefs:
- observe-authority-presence:authority-presence-observation-v1
- quality-ledger:quality-ledger-rates-v1
clusterId: measurement-trust
ctaVariant: measurement_request
capabilityIds:
- observe-authority-presence
- quality-ledger
claimIds:
- m1-observation-unit
- m5-not-observable-is-not-zero
- m6-quality-ledger-contextualises
- m7-no-recommendations
- m8-measurement-is-not-verification
- hp1-measurement-doctrine
targetQuery: how does textos avoid hallucinated claims
searchIntent: informational
shortAnswer:
  body: TextOS treats affirmations without evidence as a defect, not a stylistic choice. A deterministic TruthCheck blocks any draft that contradicts the observed evidence, drafts exist only against an accepted brief, and signals that were not observed are reported as not observable rather than as zero.
  claimIds:
  - m5-not-observable-is-not-zero
  - m6-quality-ledger-contextualises
  - hp1-measurement-doctrine
editorialClass: PRODUCT_PRINCIPLE
truthMode: DOCUMENTARY
sourcePaths:
- docs/adr/ADR-015-truthcheck-and-generation.md
sourceSemantics: ACCEPTED_ADR
sourceDigests:
  docs/adr/ADR-015-truthcheck-and-generation.md: 863c68b4af6c66f0479649064bb9607d0039c6bf097fde7f808f7c47772732f9
---

## A principle enforced in code

"No affirmation without evidence" is easy to write on a values page. It is harder to enforce, because the temptation to fill a page with a plausible sentence is a permanent feature of anything that generates text. TextOS treats the principle as a constraint on the pipeline, not as a stylistic preference. Two gates, both non-negotiable, decide whether a generated draft can move forward at all: it must exist against an accepted brief, and it must survive a deterministic contradiction check against the evidence that motivated the brief.

Both gates are described in the architecture record ADR-015. Neither can be lifted — not by a reviewer, not by a "trusted" mode, not by a model that expresses high confidence. The purpose of this article is to describe what those gates are, why the blocking half is deterministic, and what happens when a signal is absent rather than negative.

## Two gates that do not lift

The first gate is the **brief gate**. A generated draft is bound, in the schema, to the identifier of an accepted opportunity brief. The foreign key is not nullable. Generating text without such a brief is refused before any model is called. This is what ADR-015 calls the anti-content-factory rule: no orphan content, ever. A page cannot come into being because someone thought it might be interesting; it comes into being because an observation of the outside world produced a defensible reason to write it.

The second gate is the **truth gate**. Every draft is submitted to a `TruthCheck` that compares it against an `EvidenceBundle` — the observed claims, cited sources and questions that supported the brief. The check returns one of three verdicts: `pass`, `alert` or `block`. A `block` verdict freezes the pipeline: nothing downstream — no preview, no publication, no promotion — can proceed. ADR-015 states the rule without exception: the truth gate is never lifted, in any mode, including modes that eventually lift editorial review.

These two gates form the outer boundary of the principle. A draft that clears them is, at minimum, tied to an accepted brief and not in contradiction with the evidence that produced it.

## Why the blocking verdict is deterministic

The design choice that makes the truth gate defensible is that its blocking verdict is produced by deterministic rules, not by a language model. Given the same draft and the same evidence, the check returns the same verdict. Every time.

The reason is spelled out in ADR-015: a language model can inform a review, but it cannot be the ultimate arbiter of blocking. A model that decides on Tuesday that a passage contradicts an observation and on Wednesday that it does not is not a gate — it is a mood. TextOS assigns to language models only the role of raising an `alert`: a non-blocking signal, addressed to a human reviewer, that a sentence carries a semantic risk (over-affirmation, misplaced nuance, sensitive claim type). Alerts inform. Blocks decide. Only rules block.

A blocking verdict therefore comes with the exact contradiction it detected — the passage, the evidence element it collides with, and the rule that fired. That triplet is what makes the block reproducible, auditable and rebuttable. A reviewer who disagrees with the block disagrees with a concrete rule against a concrete piece of evidence, not with an opaque score.

## What "affirmation without evidence" means in the schema

Beyond outright contradiction, the principle covers a second failure mode that took a full end-to-end run to surface: a draft can be free of contradictions and still say nothing the brief asked for. ADR-015's addendum names this shape "empty content certified true" — the truth gate says `pass`, but the draft covered only one of the claims the brief required.

The response, added after the fact, is a separate check called the **BriefFulfillment check**. Every required claim of the brief must be either covered by a grounded statement in the draft or explicitly excluded with a reason a reviewer has accepted. Required editorial sections must be present. The target query must be addressed. The rule wired into the controlled preview is now cumulative: a preview is authorised only when `TruthCheck = pass` **and** `BriefFulfillment = pass`.

Two checks, then, not one. TruthCheck asks: does the draft contradict the evidence? BriefFulfillment asks: does the draft honour what the brief committed to cover? A page can be true, yet incomplete. TextOS refuses to preview it until it is both.

## Evidence honesty extends to measurements

The generation layer inherits a discipline that starts much earlier in the pipeline. When TextOS measures Authority Presence, it distinguishes zero from not observable. Zero is a measured result — the engine answered, the method looked for the signal, and the entity was not there. Not observable is the absence of a measurement — the method cannot see the signal on this engine, or the sample was too thin to say anything.

That distinction is codified in the measurement doctrine (claim `m5-not-observable-is-not-zero`): a missing observation is never recorded as a measured zero. And every measurement carries its own quality context — coverage, completeness, dispersion, provenance, observability — reported alongside the result and never merged into it (claim `m6-quality-ledger-contextualises`).

Both principles feed the generation layer. A brief cannot be defended by a measurement that was never taken, and a draft cannot affirm presence in a market segment where the signal was not observable. The evidence bundle that TruthCheck consults carries the observability flags forward. Contradicting "not observable" by claiming a value is a rule-based `block`, exactly as contradicting a measured zero would be.

## What TextOS deliberately does not affirm

The principle also draws a line around what a measurement is entitled to say. Claim `m7-no-recommendations` states that an Authority Presence measurement reports observed presence and does not produce recommendations, automatic prioritisation, return-on-investment estimates, or guarantees of ranking or citation. Claim `m8-measurement-is-not-verification` adds that a measurement reports what answer engines say about a brand — it does not establish why the engine cited a brand, and it does not verify whether the statements inside an answer are true.

These are not commercial modesties. They are structural. Capture, extraction and verification are separate layers, and TextOS reports the boundary explicitly rather than blurring it. A draft that affirmed "the engine cited us because our content is authoritative" would be affirming a causal chain the measurement cannot support. The truth gate would block such a sentence not because it disliked the tone, but because a rule fires when a passage extends a measurement into a causal claim the evidence does not carry.

## Provenance is part of the evidence

A subtler dimension of the principle covers how a draft describes its own origin. ADR-015 pins the transport used to generate a draft to one of three values: a real invocation of an LLM (with the exact model identifier), a manual external import (a human wrote the passage and imported it), or a fixture replay (a static test corpus). A draft marked as coming from a live model must correspond to an actual model invocation; a helper function refuses to derive provenance from an unknown method version rather than guessing.

The reason is that "how was this written" is itself an affirmation. A page that claims to be model-generated when it was hand-written affirms something the code cannot verify. TextOS refuses to record provenance it cannot prove.

Demonstration content — pages used to show the pipeline internally — is written by hand and marked as fixture replay throughout. Nothing in the system presents such a page as generated by a model, or as a customer case.

## What acceptance means

If nothing is generated without an accepted brief, the acceptance itself becomes the moment of truth. It is where a human, looking at a set of observed gaps, decides that a defensible reason to write exists. Everything downstream — the draft, the TruthCheck, the BriefFulfillment check, the controlled preview — inherits that acceptance. Nothing downstream can synthesise it after the fact.

This is why "no affirmation without evidence" is not a slogan attached to the output of the system. It is a rule attached to the input. If the input carries no evidence, the input never becomes a draft, and the question of what the draft affirms never arises.

## Related methodology

- [What Authority Presence measures](/methodology/authority-presence) — the observation unit that produces the evidence the truth gate consults.
- [Why not observable is not zero](/methodology/not-observable-is-not-zero) — the honesty rule that the generation layer inherits from measurement.
