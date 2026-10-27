# CPO decision — Commit-to-Content Sources cited without a link

- **Decision date**: 2026-10-27
- **Owner**: CPO
- **Scope**: Commit-to-Content notes of textos-site (TextOS CTC-CHAIN-1 common article chain)
- **Reference id**: `CPO-2026-10-27-ctc-sources-without-link`

## Statement

A Commit-to-Content note shows its Sources like every TextOS article (CMO V2 contract). Its evidence
is mostly commits of the private TextOS product repository, so each Source is cited **without a
link**, by **reference and date only** (for example `TextOS product commit d1dfde7, 25 Oct 2026`):
the commit subjects are written in French while the notes are in English, and each subject stays
readable in this site's public commit ledger. One Source is shown per cited document, however many
passages of it the note uses.

## How it applies

- Each brief records the clearance in `publicUseClearance`; `pnpm textos prepare` applies it to every
  piece of evidence through TextOS's own transition, `clearEvidenceForPublicUse`
  (`APPROVE_PUBLIC_USE`, no client validation), and keeps the receipts in `evidence-clearance.json`.
- TextOS shows a piece of evidence as a Source only when its public use is `allowed`
  (`ctcGovernedSources`, act/ctc/article-review.ts); the site checks every Source title against the
  intake at build time.
- The clearance covers citation. It does not publish an article: publication stays the per-article
  human review recorded in each brief.
