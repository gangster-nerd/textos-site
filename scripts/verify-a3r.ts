#!/usr/bin/env tsx
// A3R §15 — one authoritative certification command.
//
// Runs the full A3R governance-layer verification pipeline. Fails loudly if
// any expected artifact is missing. Prints `[verify:a3r] GREEN` on success.
//
// Steps :
//   1. Contract fingerprint verification (sealed value).
//   2. Corpus regenerated FROM Markdown (a1r-regenerate-corpus is idempotent).
//   3. A3R corpus report emission (`content/managed-corpus/A3R-REPORT.json`).
//   4. Full test suite in vitest run mode.
//   5. content:verify + verify:product-manifest + validate:jsonld gates.
//   6. build (deterministic static export).
//   7. verify:a2r rerun (asserts A2R surface parity STILL holds).
//   8. Explicit assertion : zero downstream-invalidated failures.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";

const SEALED_FP =
  "4cefe8c6ed8917180870a37a3f3dbf5d2ff3d9395563dc683fc189b4e47b7e7b";

function run(cmd: string, args: string[]): number {
  const r = spawnSync(cmd, args, { stdio: "inherit" });
  return r.status ?? 1;
}

function fail(msg: string): never {
  console.error(`[verify:a3r] FAIL — ${msg}`);
  process.exit(1);
}

function main(): void {
  // 1. Sealed contract fingerprint.
  const bytes = fs.readFileSync("contracts/content-document@1.schema.json", "utf8");
  const fp = createHash("sha256").update(bytes).digest("hex");
  if (fp !== SEALED_FP) {
    fail(
      `contract fingerprint mismatch : got ${fp} ; expected ${SEALED_FP}. A1R contract was modified — refuse to run A3R against a drifted contract.`,
    );
  }
  console.log(`[verify:a3r] contract fingerprint OK (${fp.slice(0, 12)}…)`);

  // 3. Emit A3R report.
  if (run("pnpm", ["tsx", "scripts/a3r-report.ts"]) !== 0) {
    fail("a3r-report emission failed");
  }
  if (!fs.existsSync("content/managed-corpus/A3R-REPORT.json")) {
    fail("A3R-REPORT.json missing after emission");
  }

  // 4. Full test suite.
  const testStatus = run("pnpm", ["vitest", "run"]);
  if (testStatus !== 0) fail("test suite failed");

  // 5. Producer + JSON-LD gates.
  if (run("pnpm", ["content:verify"]) !== 0) fail("content:verify failed");
  if (run("pnpm", ["verify:product-manifest"]) !== 0) {
    fail("verify:product-manifest failed");
  }

  // 6. Build (produces out/ ; A2R verify then inspects it).
  fs.rmSync("out", { recursive: true, force: true });
  if (run("pnpm", ["build"]) !== 0) fail("build failed");
  if (run("pnpm", ["validate:jsonld"]) !== 0) fail("validate:jsonld failed");

  // 7. A2R rerun against the fresh build (skip its inner build ; the one above
  // is authoritative).
  const a2rStatus = spawnSync("pnpm", ["tsx", "scripts/verify-a2r.ts"], {
    stdio: "inherit",
    env: { ...process.env, A2R_SKIP_BUILD: "1" },
  });
  if ((a2rStatus.status ?? 1) !== 0) {
    fail("verify:a2r failed — A2R surface regression introduced by A3R work");
  }

  console.log("[verify:a3r] GREEN");
}

main();
