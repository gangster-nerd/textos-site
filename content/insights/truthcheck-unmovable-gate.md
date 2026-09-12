---
title: TruthCheck — the Unmovable Gate
description: 'TruthCheck is designed as an unmovable gate: its blocking verdict is deterministic, reproducible, and never lifted by any publication mode. A language model'
contentType: product_article
language: en
editorialStatus: draft
indexingPolicy: noindex
publishedAt: '2026-09-12'
updatedAt: '2026-09-12'
productSnapshotSha: d1b8b50552e1b42768a6bd0c0515675e139780d3
evidenceRefs:
- observe-authority-presence:observe-run-orchestration-v1
- quality-ledger:quality-ledger-rates-v1
clusterId: product-engineering
ctaVariant: measurement_request
capabilityIds:
- observe-authority-presence
- quality-ledger
claimIds:
- m7-no-recommendations
- m8-measurement-is-not-verification
- hp1-measurement-doctrine
- hp2-metric-integrity
targetQuery: textos truthcheck unmovable gate architecture
searchIntent: technical
shortAnswer:
  body: TruthCheck is designed as an unmovable gate on generated content in TextOS. Its blocking verdict is deterministic — the same content against the same evidence bundle always produces the same block — and it is never lifted, even under trusted publication modes. A language model can raise non-blocking alerts, never a block.
  claimIds:
  - m8-measurement-is-not-verification
  - hp2-metric-integrity
editorialClass: ARCHITECTURE_DECISION
truthMode: DOCUMENTARY
sourcePaths:
- docs/adr/ADR-015-truthcheck-and-generation.md
sourceSemantics: ACCEPTED_ADR
sourceDigests:
  docs/adr/ADR-015-truthcheck-and-generation.md: 863c68b4af6c66f0479649064bb9607d0039c6bf097fde7f808f7c47772732f9
---

## An architecture note, not an availability claim

TruthCheck is an internal capability in the current capability registry. This article documents **how it is designed** and **why the gate is unmovable** — not a claim that a customer receives a certified-content service today. The point of the piece is architectural: to explain a decision that shapes what TextOS is willing to let out of itself, and why that decision is a hard invariant rather than a policy that could be softened by product mood.

## What TruthCheck is designed to do

Generated content, in TextOS, only exists as an extension of an accepted [Opportunity Brief](/insights/opportunity-brief-deterministic). The generation step is bounded by two gates: it must be adossed to an accepted brief (no orphan content — the "no content factory" rule), and its output must clear a truthfulness check against the evidence bundle before anything further happens.

TruthCheck is that second gate. It reads a generated draft, reads the evidence bundle assembled from real observations, and emits one of three verdicts:

- `pass` — no deterministic contradiction, no alert;
- `alert` — an LLM has flagged a semantic risk (nuance, over-affirmation) that is not a strict contradiction;
- `block` — the deterministic core has detected a contradiction against the evidence.

Only two of these verdicts have symmetric authority. `pass` and `block` both come from the deterministic core. `alert` is advisory. That asymmetry is deliberate.

## Only the deterministic core can block

ADR-015 fixes a rule that shapes every other property of the mechanism: **a `block` is always deterministic; a language model is never permitted to emit a `block`**.

The deterministic core evaluates a set of explicit rules — for example, the draft asserts a claim type that the observations attribute to a third party; the draft denies a cited piece of evidence; the draft attaches an absolute recommendation. These rules are code, not prompts. Given the same content and the same evidence bundle, the same block is produced. The verdict is reproducible.

The LLM assistance sits in a strictly weaker position. It reads the same content and the same bundle and it may raise **alerts**. It can note that a phrasing seems to overreach, that a nuance has been dropped, that a claim is stated more strongly than the observations support. It cannot block. That authority is denied by design.

The reasoning is not that the LLM is untrusted in general. It is that a **gate cannot be non-deterministic**. If a block could be raised by an LLM, then the meaning of "blocked" would drift as the model drifted, and the mechanism would be undefendable at the moment it needs to be defended: when someone asks why a piece of content was refused. TextOS refuses to have that conversation with a shrug. When TruthCheck blocks, the exact rule that fired can be produced, on demand, from code.

## The gate is unmovable, even under trusted modes

TextOS's publication layer contains a graduated trust mechanism (a state machine that can eventually lift the systematic human review of an author whose validations have consistently been clean). That mechanism exists to reduce editorial toil at scale, not to loosen the truthfulness constraint. ADR-015 fixes the boundary explicitly: **the truthfulness gate is never lifted, in any mode, including trusted**.

The graduated trust state machine can lift the systematic editorial review. It cannot lift TruthCheck. A `block` verdict halts everything downstream, regardless of the publication policy attached to the draft's scope.

This is the same discipline the public methodology carries when it says [a measurement does not verify whether statements inside an answer are true](/methodology/authority-presence): the observatory does not claim to verify the world. But an unmovable gate on generated content is not a claim about the world — it is a claim about TextOS's own outputs. The product refuses to publish content that contradicts the observations it was built on. That refusal is not an editorial preference; it is an invariant of the architecture.

## Generation is isolated behind a transport

The mechanism sits inside a broader design that keeps the language model in a narrow slot. Generation is a transport-isolated capability, following the same pattern the observatory uses for engine access: a `GenerationProvider` contract, a fixture-first implementation used in tests and in the first offline chain, and a live provider injected in a later, isolated sub-sprint. The live model is pinned; any change of model or prompt is a change of `generation_method_version`, in the same way that engine access carries a `provider_version`.

The generated content **cites only the evidence bundle**. Sources are imposed by the brief, not chosen by the model. Neutrality is a schema property, not a prompt instruction. This is what allows TruthCheck to be a deterministic function of `(content, bundle)`: because the model is constrained to a citation set the bundle already fixes, the space of possible contradictions is enumerable and can be evaluated by code.

## Provenance is honest, or the draft is refused

An addendum to ADR-015 documents a further constraint learned in practice: **provenance must be honest, or the draft is not accepted at all**. The generation transport is one of three explicit values (`anthropic_api_live`, `manual_external_import`, `fixture_replay`), and the `generation_method_version` encodes the transport. A draft may only carry `anthropic_api_live` if a real live invocation actually took place; otherwise it stays `fixture_replay` or `manual_external_import`. There is no fallback that guesses; an unknown method version raises rather than being silently coerced.

This matters because a certified-vrai draft that was in fact hand-written must never be presented as model-generated. The architecture refuses to let the provenance drift, even for demonstration content. In practice, hand-written demonstration content stays labelled `fixture_replay` everywhere — never presented as generated, never presented as a customer case.

## TruthCheck is necessary but not sufficient — the fulfillment check

The addendum captures a second lesson: **a draft can be certified true without being useful**. A `pass` from TruthCheck proves that every statement in the draft is grounded, but not that the draft covers what the brief asked for. A draft that trivially covers one required claim and stays silent on the rest can pass TruthCheck — "empty certified true".

To prevent that, an additional check runs alongside TruthCheck: brief fulfillment. Each required claim of the brief must either be covered by a grounded statement or be **explicitly excluded with a reason accepted by a human**. Required editorial sections must be present. The target query must be addressed. Only if both `TruthCheck=pass` **and** `BriefFulfillment=pass` is the controlled preview authorised.

TruthCheck and fulfillment are distinct gates, held in distinct code paths, because they answer distinct questions. TruthCheck asks: is this draft grounded? Fulfillment asks: does this draft do what the brief requires? Neither implies the other. Neither is optional.

## Preview is a diffusion state, not a validation verdict

A related discipline: controlled preview is an **orthogonal** dimension to validation. Previewing a draft never mutates its validation state. Three states coexist: `TruthCheck state`, `Preview state`, and `Publication state`. A preview receipt records that a diffusion happened; the validation state remains what it was; nothing is marked as published until an actual publication takes place. A draft can be re-previewed without ambiguity because its verdict has not been touched.

This is another small refusal that makes a larger property true: verdicts, once fixed, are not entangled with what happens downstream. Preview does not upgrade a `truthchecked` draft into "validated". Publication is a separate transition, and the truthfulness gate remains attached to it as firmly as to preview.

## Why the gate must be unmovable

There is a version of TextOS in which TruthCheck is a soft gate — where operators can override, where trusted modes lift it, where a language model can escalate a block. That version would be easier to ship and easier to sell in the short term. It would also be, at the first controversy, indefensible. If the answer to "why did this pass?" ever depends on a mode, a heuristic, or a model's judgment on the day, the mechanism is not a gate at all.

ADR-015's decision is that TextOS earns the right to publish grounded content only by keeping the gate deterministic and never lifting it. The line — nothing is written outside an accepted brief; nothing crosses the door if TruthCheck blocks; the block is deterministic — is the contract the architecture makes with itself before it makes any contract with an outside reader.

## Related methodology

- [Why TextOS Is an Observatory, Not a CMS](/insights/observatory-not-cms) — why the observation record is the ground the gate stands on.
- [Opportunity Brief — Deterministic Assembly from Evidence](/insights/opportunity-brief-deterministic) — the accepted brief that any generated draft must be adossed to.
- [What Authority Presence measures](/methodology/authority-presence) — the layer that measures without verifying, and why a separate gate is needed to verify what the product itself writes.
