---
title: From Brief to Decision — Economics as a Separate, Later Layer
description: 'A direction under exploration: TextOS is investigating an authority-opportunity economics layer that estimates a defensible break-even threshold, never a'
contentType: product_article
language: en
editorialStatus: draft
indexingPolicy: noindex
publishedAt: '2026-09-12'
updatedAt: '2026-09-12'
productSnapshotSha: d1b8b50552e1b42768a6bd0c0515675e139780d3
evidenceRefs:
- opportunity-brief:defensible-opportunity-brief-v1
capabilityIds:
- observe-authority-presence
- quality-ledger
claimIds:
- hp1-measurement-doctrine
- hp2-metric-integrity
- m5-not-observable-is-not-zero
- m7-no-recommendations
clusterId: measurement-methodology
ctaVariant: measurement_request
targetQuery: textos roi economics opportunity brief
searchIntent: informational
shortAnswer:
  body: TextOS is exploring an economics layer that would sit above the Opportunity Brief and report a break-even threshold on contribution margin — never a predicted revenue. Direction under exploration — not a delivery commitment.
  claimIds:
  - hp1-measurement-doctrine
  - m5-not-observable-is-not-zero
  - m7-no-recommendations
editorialClass: ROADMAP_DIRECTION
truthMode: PROSPECTIVE
sourcePaths:
- docs/adr/ADR-014-opportunity-brief.md
- docs/adr/ADR-018-authority-opportunity-economics.md
sourceSemantics: ROADMAP_DIRECTION
sourceDigests:
  docs/adr/ADR-014-opportunity-brief.md: f2b012b26bfe6726776bee6d038c492d1f8b1584337ddf83ee4849180a66020d
  docs/adr/ADR-018-authority-opportunity-economics.md: a72bbe02b99e7b48d4a1740f9c9dfab4b43fc0a5a362464dcedf963ed4ee2cab
disclaimer: Direction under exploration — not a delivery commitment.
---

> Direction under exploration — not a delivery commitment.

## The question the buyer eventually asks

An authority-presence measurement can be defensible on its own. It answers what is visible, on which surface, on which panel, with what dispersion, and it refuses to answer questions it was not built for. That is enough to be trusted; it is not always enough to close a decision. Sooner or later a buyer asks the next question: *what is this absence costing me, who is capturing the attention I am not, and what is the smallest portfolio of assets that would recover the ground?* This article documents where TextOS is heading on that question. It documents an exploration, not a delivered feature.

The Opportunity Brief layer, described in ADR-014, sits one step earlier. It judges — mechanically — which observed authority gaps qualify as *defensible opportunities* and assembles a proposed brief for each. It does no estimation. It uses no language model. It produces no ROI. A human accepts or rejects; the system never accepts on its own. The line we drew there is deliberately narrow: mechanical judgement of defensibility, factual assembly of evidence, human acceptance as the North Star.

The economics layer, described in ADR-018, is a *separate* and *later* derivation. It is being explored precisely because the Brief layer refuses to answer the economic question — and refusing to answer that question forever would eventually push customers into building the estimate themselves, unaided. The exploration asks: is there a way to answer without inventing numbers? The rest of this article is what "without inventing numbers" looks like in practice.

## The decision we are not going to make

There is a tempting formula for lost opportunity that reads well in a slide:

```
Estimated Lost Visits =
  Query Demand × Surface Usage Share × Answer Trigger Rate ×
  Click Opportunity × Lost Capture Share
```

Every factor in that product is a coefficient between zero and one, except `Query Demand`, which is a volume. `Query Demand` — how many prompts a market is actually running against a given topic on a given engine — is not directly observable from the outputs TextOS reads today. It has a proxy (search-volume signals from a different channel) and it has soft signals from customers, but it is not a first-party measurement. A five-fold uncertainty on that variable produces a five-fold uncertainty on the euro figure at the end of the formula. Publishing "your absence is costing you between €18k and €75k per month" would show a CFO a precision the data does not carry.

We are not going to do that. It would be the one place in the entire product where TextOS quietly overpromises, and it would poison everything else that is careful. The exploration deliberately walks around that formula.

## The inversion — a break-even threshold on contribution margin

The direction under exploration inverts the model. Instead of asking "how much revenue would we recover?", it asks "how well would the intervention have to perform to be worth doing?". Mathematically:

```
Required incremental wins           = Total intervention cost / Contribution margin per won customer

Required qualified visits (horizon) = Total intervention cost /
                                      ( Visit-to-lead rate × Lead-to-opportunity rate ×
                                        Win rate × Contribution margin per win )

Required qualified visits per month = Required qualified visits (horizon) / Amortization horizon
```

Every input in that formula is either a cost the operator controls, a funnel rate the operator can source from a system they own, or an amortization window they can set. `Query Demand` does not appear. It cannot corrupt the result because it is not in the result.

Three things follow. First, the break-even is *computable when the client has funnel and margin data*, and reports `not_available` when it does not — never zero. Second, the number produced is a **threshold**, not a **forecast**: it is a statement about the intervention, not about the market. Third, the threshold is naturally auditable. Each rate arrives as an explicit input (`visitToLeadRate`, `leadToOpportunityRate`, `opportunityWinRate`) with a source, a provenance, an observed window, and a confidence — not buried inside an "assumptions" bag. An operator who disagrees with the win-rate assumption can substitute their own and recompute. The tool respects the operator's judgement instead of overriding it.

Only when a documented demand estimate is available — first-party, partner, or provider — does the exploration add a secondary quantity: `requiredDemandShare`, the fraction of that estimate the intervention would have to capture. That number is a plausibility check the reader can perform ("do I really believe we can capture two per cent of this?"), not a claim TextOS advances.

## Epistemic status and provenance — two axes, never merged

The exploration also formalises what many marketing dashboards fudge: every economic output carries two labels, not one. **Epistemic status** answers *how sure*. **Provenance** answers *where the data came from*. A number can be `modeled` under transparent assumptions; it can be observed inside a client system; it can be reported by the client in an oral estimate; it can be an external proxy. These are all legitimate — and they are all different. A conversion rate declared by a salesperson is not the same input as a conversion rate read from GA4, even if both are called "conversion rate" in the CRM.

Two rules govern the labels. First, `commercially_observed` is the only status that can appear in a customer-facing headline — and it requires a preserved attribution mechanism, not a narrative of one. A pure declaration remains `client_reported`; it can feed a model, but it cannot become an observed commercial result by promotion. Second, ranges are always ranges. Every estimate is `low / base / high`, never a point estimate. A single number would forget how much it does not know.

## Attention allocation — a modeled distribution, never a click count

The second half of the exploration concerns *who captures the attention we are not capturing*. TextOS can produce a modelled distribution — from observable signals — of how frequently which subjects appear, with what position, how often the domain is cited directly, and how stable that distribution is across runs. That distribution is a *modeled attention allocation*, and the word "modeled" travels with the number. It is not, and cannot be, a count of clicks received by a competitor. Where a real click stream exists in a client system, the label upgrades. Where it does not, the label stays honest.

Two constraints on the distribution matter. First, it is never normalised to one hundred percent across named subjects: an unattributed share is always preserved, because a real answer can produce no click, disperse attention, or influence a later brand search that no observation captures. Second, it does not exist for `n=1`: stability across runs is a factor of the model, so a distribution is only produced when a scope has been re-observed at least three times.

## Why the layer sits later — and why it is not in S8/S9

The Brief layer must remain deterministic and ROI-free. Every argument for the pipeline's honesty depends on that. If a euro figure travelled inside `judgeOpportunities`, the mechanical judgement of defensibility would immediately become a defence of the assumptions behind the number, and the entire chain from observation to brief would inherit that fragility.

The exploration keeps the economics as a *reading layer* — a separate derivation, versioned independently, attached to the brief but not carried inside it. Two briefs assembled by the same run can be re-costed by two different versions of the economics layer without changing the briefs themselves. That is the same pattern the extraction layer already uses for claim derivations: the measurement is untouched; the reading of the measurement is versioned. It is what makes the reading contestable.

## What this article is not

It is not a launch announcement. It is not a delivery commitment. Neither `opportunity-brief` nor the economics layer is publicly available today — the Brief capability is held in `internal_only`, and the economics layer sits behind two accepted architecture decisions but not yet behind a shipped surface. What is documented here is an accepted *direction* whose invariants we have decided to publish now, precisely so that the direction can be criticised before it hardens.

Direction under exploration — not a delivery commitment. If you have run an authority-adjacent intervention in your own market, or if you have opinions about where a break-even model like this would break, we would like to hear them.

## Related reading

- [What Authority Presence measures](/methodology/authority-presence) — the observation layer this direction sits above.
- [Not observable is not zero](/methodology/not-observable-is-not-zero) — the doctrine of absence that governs `not_available` throughout.
- [The Measurement Quality Ledger](/methodology/measurement-quality-ledger) — how confidence is reported alongside every reading.
