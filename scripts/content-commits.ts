#!/usr/bin/env tsx
// `pnpm content:commits [--product-repo-path <path>]`
//
// Writes textos/ledger/product-commits.json, the commit ledger of the Commit-to-Content client
// (lib/textos-client/commit-ledger.ts): the textos-v0 commits this site's articles cite, plus the
// product pin. Run it after `pnpm textos write`, and again whenever a citation changes: the build
// refuses an article while the ledger and the citations disagree in either direction.
//
// Every citation is resolved by git itself and must be an ancestor of the product pin: a commit
// that exists only on another branch or another machine is refused, never written. Read-only on
// the product clone (TEXTOS_PRODUCT_REPO, or --product-repo-path): no checkout, no fetch. A
// shallow clone is refused, since a truncated history would make a real commit look unreachable.
// Git plumbing only — no network, no LLM. Only sha, author date and subject are written.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { buildLedger, collectCitations } from "../lib/textos-client/commit-ledger";
import { loadBriefs, loadToolRecord } from "../lib/textos-client/ctc-articles";

const ROOT = path.resolve(__dirname, "..");
const LEDGER = path.join(ROOT, "textos", "ledger", "product-commits.json");

function productRepo(): string {
  const argv = process.argv.slice(2);
  const idx = argv.indexOf("--product-repo-path");
  const repo = idx >= 0 ? argv[idx + 1] : process.env.TEXTOS_PRODUCT_REPO;
  if (!repo || !existsSync(path.join(repo, ".git"))) {
    throw new Error("content:commits: pass --product-repo-path <full textos-v0 clone> or set TEXTOS_PRODUCT_REPO.");
  }
  return repo;
}

function git(repo: string, args: string[]): string {
  return execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function main(): void {
  const repo = productRepo();
  if (git(repo, ["rev-parse", "--is-shallow-repository"]).trim() !== "false") {
    throw new Error(`content:commits: ${repo} is a shallow clone; use a full clone.`);
  }
  const tool = loadToolRecord(ROOT);
  const productRef = tool.product.sha;
  const citations = collectCitations(loadBriefs(ROOT));

  const shas = [...new Set([productRef, ...citations.map((c) => c.sha)])];
  const commits = shas.map((sha) => {
    if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error(`content:commits: ${sha} is not a full 40-hex SHA.`);
    const ancestry = spawnSync("git", ["-C", repo, "merge-base", "--is-ancestor", sha, productRef], { encoding: "utf8" });
    if (ancestry.status !== 0) throw new Error(`content:commits: ${sha} is not in the history of the product pin ${productRef}.`);
    const [full, date, subject] = git(repo, ["log", "-1", "--format=%H%x1f%aI%x1f%s", sha]).trim().split("\x1f");
    if (full !== sha || !date || subject === undefined) throw new Error(`content:commits: could not read ${sha}.`);
    return { sha, date, subject };
  });

  const ledger = buildLedger({ productRepository: tool.repository, productRef, commits, citations });
  mkdirSync(path.dirname(LEDGER), { recursive: true });
  writeFileSync(LEDGER, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
  console.log(`content:commits: ${ledger.commitCount} commit(s) — ${citations.length} citation(s) and the product pin ${productRef.slice(0, 7)}.`);
}

main();
