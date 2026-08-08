---
title: "Does TextOS automatically verify claims?"
description: "TextOS captures Answer Evidence and extracts claims deterministically, but it does not decide whether those claims are true."
contentType: faq_entry
language: en
editorialStatus: published
indexingPolicy: noindex
publishedAt: "2026-07-31"
updatedAt: "2026-07-31"
productSnapshotSha: "d1b8b50552e1b42768a6bd0c0515675e139780d3"
evidenceRefs:
  - "claim-evidence-layer:answer-evidence-capture-v1"
  - "claim-evidence-layer:deterministic-claim-extraction-v1"
capabilityIds:
  - claim-evidence-layer
claimIds:
  - s8-answer-evidence-capture
  - s8-deterministic-extraction
  - s8-no-automatic-verification
  - hp1-measurement-doctrine
  - hp2-metric-integrity
clusterId: measurement-trust
ctaVariant: measurement_request
visualIds:
  - epistemic-layers-v1
targetQuery: "does TextOS verify claims"
searchIntent: commercial_investigation
shortAnswer:
  body: "No. TextOS captures Answer Evidence and extracts claims from it deterministically, but it does not decide whether those claims are true. Capture and extraction are separate from verification and judgement."
  claimIds:
    - s8-answer-evidence-capture
    - s8-deterministic-extraction
    - s8-no-automatic-verification
---

## What does TextOS automate?

Within the Claim Evidence Layer, TextOS automates two bounded operations: it captures Answer Evidence and extracts claims from that evidence deterministically. The result represents what was stated in the captured answer evidence; it is not a verdict that the extracted proposition is true.

The Claim Evidence Layer is a committed and tested technical foundation, not a generally available product capability. Its current value is precision about the boundary: TextOS can record and extract without relabelling extraction as fact-checking.

## What is Answer Evidence?

**Answer Evidence is the captured material associated with an observed answer and used as the basis for claim extraction.** In this context, “evidence” identifies the traceable basis of an observation. It does not mean that every proposition contained in that material has been proven true.

That distinction is consistent with established provenance practice. The W3C defines provenance as information about the entities, activities and people involved in producing data; provenance can support an assessment of quality, reliability or trustworthiness, but it is not itself a truth verdict.

## What does deterministic claim extraction mean?

**Deterministic claim extraction means that the same Answer Evidence, processed under the same extraction rules, produces the same extracted claims.** NIST uses the same core definition for a deterministic algorithm: the same inputs produce the same outputs.

Determinism makes the transformation reproducible. It allows reviewers to examine the same input-to-output relationship without treating model variation as part of the extraction result. It does not establish that the source statement is accurate, complete or supported.

## Why is claim extraction different from claim verification?

Claim extraction identifies a proposition contained in source material. Claim verification asks a separate question: whether that proposition is supported, refuted or lacks sufficient evidence.

The FEVER research benchmark formalised verification as a distinct task in which a claim is evaluated against retrieved evidence and assigned a status such as supported, refuted or not enough information. The Claim Evidence Layer stops before that judgement. TextOS captures the evidence and extracts the claim; it does not automatically decide the claim’s truth.

## Can an extracted claim still be false?

Yes. An extracted claim can still be false, incomplete or unsupported. If an observed answer contains such a proposition, deterministic extraction can still reproduce that proposition consistently. Extraction fidelity and factual correctness are different properties.

This is why an extracted claim should be read as **a traceable representation of what the observed answer said**, not as a certified fact about the world. The evidence supports inspection of the observation and the extraction boundary; it does not remove the need for separate verification when truth is the question being asked.

## What can a buyer safely conclude from the output?

A buyer can conclude that TextOS captured Answer Evidence and extracted the identified claims under deterministic rules. A buyer cannot conclude, from that extraction alone, that the claims are true.

A precise evaluation therefore separates four layers:

1. **Observation:** what answer material was captured?
2. **Extraction:** what claims were identified in that material?
3. **Verification:** what independent evidence supports or refutes each claim?
4. **Judgement:** what conclusion should a person or downstream system draw?

The Claim Evidence Layer currently addresses the first two layers. It does not collapse them into the third or fourth.

## How does this boundary fit the wider TextOS measurement doctrine?

Every TextOS output must retain the status of what was actually observed, never collapsed into inference. The same epistemic rule governs authority-presence measurement — Direct, Indirect and Total are separate measures; Total Authority Presence is a union of direct and indirect presence, never a sum; when a signal is not observable with a given method, TextOS reports it as not observable, never as zero — and it governs the Claim Evidence Layer in exactly the same way: captured Answer Evidence and extracted claims are never silently relabelled as verified facts.

Under the same rule, a missing observation is not evidence of absence, an extracted proposition is not a verified fact, and a measurement is not a score.

## Why make this limitation explicit?

Stating the boundary between claim extraction and truth verification explicitly defines what a buyer may safely conclude from TextOS output. An evaluator can rely on TextOS to distinguish captured Answer Evidence from deterministically extracted claims, while recognising that separate evidence or human judgement is still required to determine whether a claim is true.

TextOS therefore states the limitation directly: the Claim Evidence Layer captures Answer Evidence and extracts claims deterministically. It does not automatically verify whether those claims are true.

## Sources

- NIST Computer Security Resource Center, “Deterministic Algorithm,” citing NIST SP 800-90A Rev. 1. https://csrc.nist.gov/glossary/term/deterministic_algorithm
- W3C, “PROV-Overview: An Overview of the PROV Family of Documents.” https://www.w3.org/TR/prov-overview/
- Thorne et al., “FEVER: a Large-scale Dataset for Fact Extraction and VERification,” NAACL 2018, DOI: 10.18653/v1/N18-1074. https://aclanthology.org/N18-1074
