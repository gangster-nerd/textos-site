// Commit ledger of the Commit-to-Content client — the product commits this site's articles cite,
// plus the product pin itself. Written by `pnpm content:commits` from a full textos-v0 clone (git
// plumbing only: sha, author date, subject), read at build time without any product checkout.
//
// The ledger and the citations must agree in BOTH directions: a cited commit missing from the
// ledger was never checked against the product history; a ledger entry nothing cites is history
// this public repository carries for no reason (textos-v0 is private). Same contract as the
// ShortsOS client (shortsos-site src/lib/commit-to-content/commit-ledger.ts).

import type { ArticleBrief } from "./brief";

export const LEDGER_VERSION = 1;
export const PRODUCT_PIN_CITATION = "product-pin";

export interface LedgerCommit {
  sha: string;
  date: string;
  subject: string;
  citedBy: string[];
}

export interface ProductCommitLedger {
  ledgerVersion: typeof LEDGER_VERSION;
  productRepository: string;
  productRef: string;
  commitCount: number;
  commits: LedgerCommit[];
}

export interface CommitCitation {
  sha: string;
  citedBy: string;
}

/** Every commit an article cites: its CTC source groups and its commit-message evidence. */
export function collectCitations(briefs: readonly ArticleBrief[]): CommitCitation[] {
  const out: CommitCitation[] = [];
  for (const brief of briefs) {
    const shas = new Set<string>();
    for (const group of brief.provenance.ctcSourceGroups) for (const sha of group.sourceCommits) shas.add(sha);
    for (const ev of brief.evidence) if (ev.source.kind === "product_commit") shas.add(ev.source.sha);
    for (const sha of [...shas].sort()) out.push({ sha, citedBy: brief.articleId });
  }
  return out;
}

export function buildLedger(input: {
  productRepository: string;
  productRef: string;
  commits: readonly { sha: string; date: string; subject: string }[];
  citations: readonly CommitCitation[];
}): ProductCommitLedger {
  const citedBy = new Map<string, Set<string>>();
  citedBy.set(input.productRef, new Set([PRODUCT_PIN_CITATION]));
  for (const c of input.citations) {
    const set = citedBy.get(c.sha) ?? new Set<string>();
    set.add(c.citedBy);
    citedBy.set(c.sha, set);
  }
  const bySha = new Map(input.commits.map((c) => [c.sha, c]));
  const commits: LedgerCommit[] = [...citedBy.entries()]
    .map(([sha, by]) => {
      const c = bySha.get(sha);
      if (!c) throw new Error(`commit-ledger: no commit record for cited ${sha}.`);
      return { sha, date: c.date, subject: c.subject, citedBy: [...by].sort() };
    })
    .sort((a, b) => (a.date === b.date ? a.sha.localeCompare(b.sha) : a.date.localeCompare(b.date)));
  return {
    ledgerVersion: LEDGER_VERSION,
    productRepository: input.productRepository,
    productRef: input.productRef,
    commitCount: commits.length,
    commits,
  };
}

/** Issues (empty = agreement) between a ledger, the product pin and the citations. */
export function ledgerIssues(ledger: ProductCommitLedger, productRef: string, citations: readonly CommitCitation[]): string[] {
  const issues: string[] = [];
  if (ledger.ledgerVersion !== LEDGER_VERSION) issues.push(`ledger version ${ledger.ledgerVersion} is not ${LEDGER_VERSION}.`);
  if (ledger.productRef !== productRef) issues.push(`ledger is pinned to ${ledger.productRef}, textos/tool.json to ${productRef}.`);
  if (ledger.commitCount !== ledger.commits.length) issues.push("ledger commitCount does not match its commits.");
  const expected = new Map<string, Set<string>>([[productRef, new Set([PRODUCT_PIN_CITATION])]]);
  for (const c of citations) {
    const set = expected.get(c.sha) ?? new Set<string>();
    set.add(c.citedBy);
    expected.set(c.sha, set);
  }
  const actual = new Map(ledger.commits.map((c) => [c.sha, new Set(c.citedBy)]));
  for (const [sha, by] of expected) {
    const got = actual.get(sha);
    if (!got) issues.push(`cited commit ${sha} (${[...by].join(", ")}) is not in the ledger — run \`pnpm content:commits\`.`);
    else if ([...by].sort().join(",") !== [...got].sort().join(",")) issues.push(`ledger citedBy for ${sha} is stale — run \`pnpm content:commits\`.`);
  }
  for (const sha of actual.keys()) if (!expected.has(sha)) issues.push(`ledger holds ${sha}, which nothing cites.`);
  return issues;
}
