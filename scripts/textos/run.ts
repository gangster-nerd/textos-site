#!/usr/bin/env tsx
/**
 * `pnpm textos <step> --textos-path <path> [step options]`
 *
 * textos-site is a production client of TextOS's Commit-to-Content input source, under the same
 * rules as any client (ported from the ShortsOS client, shortsos-site scripts/textos/run.ts). This
 * launcher is the only way the drivers under `scripts/textos/steps/**` reach TextOS code, and it
 * enforces the one rule that makes that safe: TextOS is never modified.
 *
 *   1. The TextOS checkout at `--textos-path` must sit at EXACTLY the SHA `textos/tool.json` pins
 *      for that step (the writer, or the surface polish), with a clean working tree (no tracked
 *      change, no untracked file).
 *   2. The step runs under TextOS's OWN `tsx` and `tsconfig.json`, so TextOS modules resolve their
 *      path aliases exactly as they do inside TextOS. site modules are imported by relative
 *      path only. Nothing is copied into, generated in, or patched inside the checkout.
 *   3. After the step, the working tree is checked again: a step that left any trace in the
 *      checkout fails the run.
 *
 * Steps: `prepare --article <id>`, `write --article <id>` (writer pin).
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "..", "..");
const STEPS = ["prepare", "write"] as const;
type Step = (typeof STEPS)[number];

interface ToolPin {
  repository?: string;
  sha: string;
}

function fail(message: string): never {
  console.error(`textos: ${message}`);
  process.exit(1);
}

function git(repo: string, args: string[]): string {
  return execFileSync("git", ["-C", repo, ...args], { encoding: "utf8" }).trim();
}

function assertPristine(textosPath: string, when: string): void {
  const dirty = git(textosPath, ["status", "--porcelain=v1", "--untracked-files=all"]);
  if (dirty.length > 0) {
    fail(`TextOS checkout at ${textosPath} is not clean ${when}. TextOS must never be modified:\n${dirty}`);
  }
}

function main(): void {
  const [step, ...rest] = process.argv.slice(2);
  if (!step || !(STEPS as readonly string[]).includes(step)) {
    fail(`first argument must be one of: ${STEPS.join(", ")}.`);
  }

  const pathIdx = rest.indexOf("--textos-path");
  const textosPath = pathIdx >= 0 && rest[pathIdx + 1] ? resolve(rest[pathIdx + 1]!) : null;
  const tool = JSON.parse(readFileSync(join(REPO_ROOT, "textos", "tool.json"), "utf8")) as { repository: string; writer: ToolPin };
  const pin = tool.writer;
  const repository = pin.repository ?? tool.repository;
  if (!textosPath || !existsSync(join(textosPath, ".git"))) {
    fail(`--textos-path <path to a checkout of ${repository}> is required for ${step}.`);
  }

  const head = git(textosPath, ["rev-parse", "HEAD"]);
  if (head !== pin.sha) {
    fail(
      `TextOS checkout is at ${head}, but textos/tool.json pins ${pin.sha} (${repository}) for ${step}. ` +
        `Check out the pinned SHA in that checkout yourself (\`git -C ${textosPath} checkout ${pin.sha}\`); ` +
        "this launcher never changes it.",
    );
  }
  assertPristine(textosPath, "before the step");

  const tsx = join(textosPath, "node_modules", ".bin", "tsx");
  if (!existsSync(tsx)) {
    fail(`no ${tsx}. Install TextOS's own dependencies in that checkout first (\`pnpm install --frozen-lockfile\`).`);
  }

  const stepFile = join(REPO_ROOT, "scripts", "textos", "steps", `${step as Step}.ts`);
  const result = spawnSync(tsx, ["--tsconfig", join(textosPath, "tsconfig.json"), stepFile, ...rest], {
    cwd: REPO_ROOT,
    stdio: "inherit",
    env: { ...process.env, TEXTOS_ROOT: textosPath, TEXTOS_REF: head, TEXTOS_SITE_ROOT: REPO_ROOT },
  });

  assertPristine(textosPath, "after the step");
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

main();
