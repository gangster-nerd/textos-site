# `textos/` — textos-site as a production client of Commit-to-Content

TextOS's own public site uses TextOS's Commit-to-Content (CTC) input source the way any client
would: as a **tool**, under the same rules. Everything in this directory is the site's own client
record and the artefacts TextOS produced for it. Nothing here is TextOS source, and nothing is ever
written to a TextOS repository. The driver is ported from the first CTC client, ShortsOS
(`gangster-nerd/shortsos-site`, `textos/README.md`); RepOS runs the same pattern with two human
gates.

## The chain

```
textos-v0 commits ─┐
product truth  ────┼─► brief (CMO: buyer question, target query, verbatim evidence, slot plan)
                   │      └─► TextOS CTC intake → geo-writer → TruthCheck → ContentDocument@1
                   │             └─► textos/runs/<id>/ (receipt + hashes)
                   └─► textos/ledger/product-commits.json (cited commits only)
                                    └─► lib/textos-client: verify without TextOS, project → /insights
```

- **Why the article exists**: the source commits (`provenance.ctcSourceGroups`).
- **What it may say**: only what the quoted evidence supports, at the product pin.
- **Who decides what is true**: TextOS's writer and TruthCheck. Only a `pass` is packaged.
- **Who decides it is public**: a human, per article (`publication.humanReview` in the brief).

## Pins (`tool.json`)

| Pin | Ref | Role |
|---|---|---|
| writer | `cert/textos-v1-e2e-20261023` @ `308aa32` | CTC seam `ctc-geo-writer-adapter@0.1`, `geo-writer@0.2`, prompt `geo-writer-slot@0.5`, grounded TruthCheck, evidence approval, ContentDocument@1 bridge |
| product | same SHA, `CERTIFIED_CANDIDATE` | the truth an article may state: cited commits are its ancestors, quoted files are read at it |

textos-v0 `main` is still at `91b6180` (2026-10-01); the V1 certification trunk carries the work
these articles describe. Because the truth is the certification candidate and not `main`, every
article stays a **draft** until its human review is recorded.

## Commands

```bash
# A pristine, full (non-shallow) checkout of textos-v0 at the pinned SHA, with its own deps:
git -C <textos-v0 clone> worktree add --detach <path> 308aa3276f9d0f80035478545e34f4885c0349e0
(cd <path> && pnpm install --frozen-lockfile)

# 1. Brief → TextOS intake → plan → exported slot prompts (textos/runs/<id>/prompts/, git-ignored).
pnpm textos prepare --article <articleId> --textos-path <path>

# 2. Answer runs/<id>/prompts/* in runs/<id>/responses/<slot>.json, then:
pnpm textos write --article <articleId> --textos-path <path>

# 3. Record the brief's commits in the ledger (the build refuses the article until they are there).
pnpm content:commits --product-repo-path <full textos-v0 clone>
```

`scripts/textos/run.ts` refuses to start unless the checkout sits at exactly the pinned SHA with a
clean working tree, runs the step under TextOS's own `tsx`/`tsconfig.json`, and checks the tree is
still clean afterwards. `prepare` refuses any evidence quote that is not verbatim in its source (a
commit message, a file at the pin, a manifest field) and any commit outside the pin's history.
`write` refuses any answer written against a prompt TextOS no longer renders identically, any
writer refusal, and any TruthCheck verdict other than `pass`.

## Who wrote the slots

TextOS's writer calls its slot provider once per slot; the live provider's transport is
injectable. No API key was available, so the transport was the operator: a Claude Code session
acting as TextOS CTO/CMO answered each exact prompt TextOS rendered. TextOS's own provider class
still built every prompt and parsed every answer. The recorded identity is
`operator:claude-code|geo-writer-slot@0.5` — never the API model, which did not run. To use the
live model, construct `ClaudeGeoWriterSlotProvider` without a transport in `steps/write.ts`, with a
key and a call budget; nothing else changes.

TextOS's structural editorial-quality gate (`editorial-quality@0.3`) is run and recorded in each
run (`editorial-quality.json`, `HUMAN-REVIEW.md`) as **signals**: it measures an article against
the strategy TextOS derives for opportunity articles (buyer-guide sections, FAQ, comparison
object), which an engineering note does not follow by design. TextOS has no CTC-specific editorial
strategy yet; that is product work, listed in `docs/decisions/CTO-CPO-2026-10-26-commit-to-content-input-source.md`.

## What each run commits (`runs/<articleId>/`)

| File | Produced by |
|---|---|
| `intake.json`, `evidence-usability.json`, `adapt.json` (with the prompt hashes) | `prepare` |
| `responses/` | the operator |
| `writer-outcome.json`, `lineage.json`, `content-document.json`, `resolved-surface.json`, `article-structure.json`, `editorial-quality.json`, `receipt.json`, `HUMAN-REVIEW.md` | `write` |

## What the site checks without TextOS (build, tests)

`lib/textos-client/ctc-articles.ts` refuses to surface an article — the build fails — unless:

- the receipt names the pinned writer SHA and the product pin;
- TruthCheck is `pass` in the receipt and in the lineage;
- an operator transport never claims an API model identity;
- the ContentDocument, lineage, resolved surface, plan and every response hash-match the receipt;
- every text block is the writer's own slot text, verbatim;
- every cited commit is in the ledger, and the ledger holds nothing else;
- every named product entity is in the pinned manifest.

The site then projects the writer's document into its catalogue: it adds the section headings the
plan fixed, splits multi-paragraph slots into paragraph blocks, and fills site-owned metadata
(author, topic, canonical path). It never changes a word. Kicker: `commit to content`.

## Publication

Every article is a draft — Preview only, `noindex`, no publication date, no CTA — until
`publication.humanReview` in its brief reads `done` with a reviewer and a date. `HUMAN-REVIEW.md`
is the reviewer's packet: each slot, each statement, the evidence it cites, the editorial-quality
signals, and a checklist (CPO-2026-09-12: how-we-build storytelling only, no customer feature, no
availability, no CTA).

## What this public repository does not carry

textos-site is public; textos-v0 is private. So: no TextOS prompt text (prompts are regenerated by
`prepare`; only their hashes are committed), no product history beyond the cited commits and the
pin (sha, date, subject), and no product environment variable name (tested).
