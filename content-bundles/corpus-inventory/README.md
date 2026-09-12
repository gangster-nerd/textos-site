# Corpus inventory — CTC-9-A checkpoint

Governed inventory of publishable editorial briefs extracted from a specific
authoritative product SHA.

Read-only source rule (per `docs/decisions/CMO-2026-09-12-product-thinking-disclosure.md`):
every brief is bound to source paths read **exclusively** via
`git show <sourceProductRef>:<sourcePath>` on the specified accepted product SHA.
Working-tree state, unmerged branches and forks are non-authoritative.

## Directory layout

```
corpus-inventory/
  <truthLevel>-<sha7>/
    briefs.json    ← 45 briefs, each with sourceDigests populated
```

For each brief:

- `sourceProductRef` — accepted product SHA (top-level of the JSON)
- `sourcePaths[]` — files read from that SHA
- `sourceDigests{path: sha256}` — cryptographic proof of what was read
- `sourceSemantics` — `ACCEPTED_ADR` | `IMPLEMENTATION_EVIDENCE` |
  `VERIFIED_CHANGE_RECORD` | `HISTORICAL_SPRINT_INTENT` |
  `ROADMAP_DIRECTION` | `GOVERNANCE_DECISION`
- `editorialClass` — `PRODUCT_PRINCIPLE` | `ARCHITECTURE_DECISION` |
  `ENGINEERING_NOTE` | `EXPERIMENT` | `ROADMAP_DIRECTION` | `RETROSPECTIVE` |
  `COMPANY_TECHNOLOGY` (`CURRENT_CAPABILITY` reserved for capability-availability content)
- `truthMode` — `AUTHORITATIVE` | `DOCUMENTARY` | `PROSPECTIVE`
- `disclaimer` — required verbatim for `ROADMAP_DIRECTION`: "Direction under
  exploration — not a delivery commitment."

## Regenerating digests

```bash
pnpm tsx scripts/corpus-digest.ts \
  content-bundles/corpus-inventory/authoritative-a0efa14/briefs.json
```

The script reads every `sourcePath` via `git show <sha>:<path>` on
`TEXTOS_PRODUCT_REPO` (default `/Users/marc/Desktop/textos`) and rewrites
the `sourceDigests` map in place. Any missing path is stamped `MISSING_AT_SHA`
so a hidden loss is impossible.
