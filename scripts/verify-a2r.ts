#!/usr/bin/env tsx
// A2R-PORT — one authoritative certification command.
//
// Builds first (unless A2R_SKIP_BUILD=1), then runs all A2R tests. Non-zero exit
// on any failure. Prints `[verify:a2r] GREEN` on success.
//
// This command NEVER succeeds because `out/` is missing — either it builds,
// or it fails loudly.

import { spawnSync } from "node:child_process";
import fs from "node:fs";

function run(cmd: string, args: string[]): number {
  const r = spawnSync(cmd, args, { stdio: "inherit" });
  return r.status ?? 1;
}

function main(): void {
  if (!process.env.A2R_SKIP_BUILD) {
    console.log("[verify:a2r] building...");
    // Clean previous export so we always inspect fresh artefacts.
    fs.rmSync("out", { recursive: true, force: true });
    const buildStatus = run("pnpm", ["build"]);
    if (buildStatus !== 0) {
      console.error("[verify:a2r] pnpm build failed");
      process.exit(buildStatus);
    }
  }
  if (!fs.existsSync("out/insights") || !fs.existsSync("out/authors/marc-prempain.html")) {
    console.error(
      "[verify:a2r] expected build artefacts missing (out/insights, out/authors/marc-prempain.html)",
    );
    process.exit(1);
  }
  console.log("[verify:a2r] running A2R tests...");
  const testStatus = run("pnpm", [
    "vitest",
    "run",
    "tests/a2r-render-semantic-parity.test.ts",
    "tests/a2r-mutation-tests.test.ts",
    "tests/a2r-author-route.test.ts",
  ]);
  if (testStatus !== 0) {
    console.error("[verify:a2r] A2R tests failed");
    process.exit(testStatus);
  }
  console.log("[verify:a2r] GREEN");
}

main();
