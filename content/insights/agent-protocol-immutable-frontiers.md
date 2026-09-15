---
title: Agent Protocol — Immutable Frontiers and Explicit GO
description: 'Development agents at TextOS work under a written protocol: canonical artefacts stay human-controlled, frozen frontiers hold mid-sprint, no commit without a GO.'
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
schemaType: Article
image:
  src: /og/insights/agent-protocol-immutable-frontiers.svg
  alt: Agent Protocol — Immutable Frontiers and Explicit GO — TextOS Insight
  width: 1200
  height: 630
primaryTopicId: how-we-build
topicIds:
- how-we-build
audience: reader-technical
funnelStage: awareness
productSnapshotSha: d1b8b50552e1b42768a6bd0c0515675e139780d3
evidenceRefs: []
capabilityIds: []
claimIds:
- hp1-measurement-doctrine
- hp2-metric-integrity
clusterId: product-engineering
ctaVariant: none
targetQuery: how textos uses development agents
searchIntent: informational
shortAnswer:
  body: 'We build TextOS with development agents governed by a written protocol: agents never touch git identity or canonical artefacts on their own initiative, never modify frozen frontiers inside a sprint, and never land a commit without an explicit human GO after reading raw command output.'
  claimIds:
  - hp1-measurement-doctrine
  - hp2-metric-integrity
editorialClass: COMPANY_TECHNOLOGY
truthMode: DOCUMENTARY
sourcePaths:
- AGENTS.md
sourceSemantics: GOVERNANCE_DECISION
sourceDigests:
  AGENTS.md: 367b49e832065575f260d7941376ce5ab256adb5789a50464e60fe2eecd72c6e
---

## How we build TextOS

TextOS is built with development agents. Some of the code, some of the tests, some of the migrations pass through an agent before they pass through a human. That is not a marketing statement — it is an operational reality of a small team choosing to move quickly without hiring proportionally. Building this way is only defensible if the process itself is written down, and if the written process is strict enough that "the agent said it was fine" is not, ever, an acceptable answer.

This article documents the protocol we chose. It is our engineering discipline, not a customer feature. There is no waitlist, no external access point. What follows is how we work — the rules the agent operates under, the boundaries it cannot cross, and the human step that closes every sprint. We publish it because the credibility of a measurement product depends on the credibility of the process that produces it, and we would rather show that process than describe its outcome.

## Three inviolable rules

The protocol opens with rules an agent may not break, regardless of what a task appears to require.

**Git identity is never touched by an agent.** No agent configures, modifies, or rewrites `user.name` or `user.email`. Not globally, not locally. Identity is set once, by a human, on a human's machine. Commits are signed with that identity because that is the machine the work runs on — never because an agent quietly configured it. The moment the identity layer becomes something an agent can touch, the entire chain of authorship becomes negotiable.

**Canonical artefacts are modified only on explicit instruction.** The product vision, the market documents and the specification (`docs/product/`), every accepted architecture decision (`docs/adr/`), and the protocol itself (`AGENTS.md`) are canonical. An agent reads them constantly — every task is framed by them — and never rewrites them to "improve" a decision. A decision is a decision. An ADR revision or a boundary change is a task for the human, outside the sprint. The protocol calls out the failure mode this rule prevents: an agent that thinks in good faith it has found a better shape for a frozen contract, and moves the contract silently to fit its own solution.

**Frozen frontiers do not move inside a sprint.** Once ADR-001 and ADR-002 are frozen, the contracts they define — engine provider interfaces, invocation and observation types, citation and tracked-entity shapes, the eight observation statuses, the S0.B database schema — are not to be modified during any subsequent execution sprint. This rule is doing a specific job: it protects the handoff between agents. A backup agent that inherits a project it did not design must not be able to break a contract it does not fully understand. The frozen frontier is the surface across which agents can trade shifts without stepping on each other's assumptions.

## What "vert" does not prove

Two rules at the heart of the protocol address a specific class of self-deception: the "everything is green" declaration.

Passing tests prove that code *runs*. They do not prove that the code *respects the decisions* — the ADRs, the frozen frontiers, the perimeter written into the sprint prompt. A green build does not detect a moved boundary. It does not detect a destructive migration hiding behind an apparently-clean diff. It does not detect a field quietly added to a frozen contract. It does not detect logic that has drifted outside the sprint's declared scope. Compliance and correctness are two different verifications. The tests speak to one; a human reading the code speaks to the other. Both are required. Neither substitutes for the other.

The second rule closes the corresponding loophole in agent-agent-human dialogue. An agent is never asked "is this compliant?" — because a self-graded summary is a text the agent already knows how to shape favourably. The agent is asked instead to *run verification commands and paste the raw output, in full, without summarisation and without selection*. The output of `git diff --stat`, of `grep`, of `cat` on a migration file is a neutral artefact: it cannot be rewritten to flatter the work that produced it. What the agent is not allowed to do is *edit the output before pasting*. The human reads the raw text, and only the human renders the verdict.

## The sprint sequence — a written protocol, not a habit

Every sprint follows the same four-step sequence. It is written down precisely so that it does not degrade under time pressure.

1. **Plan first, execute after validation.** The agent proposes a plan and stops. Only after a human validation does execution begin. When execution ends, the agent shows the diff and does not commit.
2. **Verification commands and raw output.** The agent runs verification commands — the exact set is defined per sprint, but always includes a quantitative view of the diff, a name-only file list, a pre-commit `git status`, and any grep-based non-regression checks the sprint requires. The raw output is pasted in full.
3. **Human verdict.** The human reads the pastes. The verdict is either GO or a list of corrections. The verdict is textual and explicit.
4. **On explicit GO only.** The agent stages, shows the final `git status` and `git diff --cached --name-only`, produces the commit, pushes, and — where CI applies — confirms the run is green.

The single signal that ends a sprint is an explicit human GO after reading raw verification output. Nothing else counts. Green tests do not count. A confident agent summary does not count. A CI badge does not count. Only the human, reading the output, on the record. That is the seam through which two entirely different agents can share a codebase without either of them becoming the point of failure.

## Verification, in practice

The protocol lists the verification commands that must be pasted every sprint. Each of them exists to detect a specific class of silent regression.

`git diff --stat` and `git diff --name-only` produce, respectively, a quantitative view of the change and a nominal list of touched files. Any change to a forbidden file appears in the second view immediately. `git status` and `git diff --cached --name-only`, run before every commit, verify that exactly the expected files are staged, nothing more and nothing less — no stray `.env`, no forgotten dependency, no half-added migration. Grep-based checks confirm that a frozen type imported into new code has not been redefined, and that a forbidden term (a network call, a `process.env` reference, an internal type name that should stay contained) has not slipped into the diff.

Migrations receive their own rule. The raw SQL is read from the generated file, not inferred from the TypeScript model that produced it. That is because a Drizzle model that looks additive can generate SQL that drops and recreates a table. The human reads the SQL, confirms that the change is additive or a properly-traced correction, checks that primary keys and constraints survive, and only then approves.

Every one of these commands has the same property: its output cannot be embellished. That property is why the protocol trusts them.

## Anti-content-factory and the doctrine that closes the loop

One line in the protocol reads: *no generated content is published unless it is backed by an accepted Opportunity Brief.* That line is a boundary that lives between the engineering layer and the product itself. It is why the graduated publication regime described elsewhere has two gates that never lift. It is why the Opportunity Brief layer refuses to accept a brief automatically. It is why the extraction layer does not judge truth.

We wrote this rule into the agent protocol on purpose. An agent can technically produce content; the protocol says an agent may not produce content that is not tied to a defended opportunity. That constraint travels from the engineering rule ("no content-farm behaviour") to the product rule ("no publication without a brief") to the measurement rule ("a signal that is not observable is not zero"). It is the same discipline at three altitudes.

## When in doubt

The protocol closes with a rule that is more cultural than technical: an agent that is uncertain whether to follow the protocol or to satisfy a request stops and asks a human. The rule primes velocity in favour of the rule. We wrote it that way because a slow correct sprint is recoverable; an undetected boundary violation is not. The protocol is the way we scale a small team without letting the tools that help us move fast quietly rewrite the product we are building.

We publish it here because how a system is built is part of what the system is worth.
