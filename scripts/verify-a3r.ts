#!/usr/bin/env tsx
// PR21-FINAL-RELEASE-GATE §5 — authoritative certification command.
//
// The FULL certification pipeline. Fails loudly on any missing artefact and
// prints `[verify:a3r] GREEN` on success. This command is safe to run on a
// FRESH CLONE — no pre-existing `out/` is required, and stale build outputs
// are wiped before the authoritative build starts.
//
// Ordering rationale : some A2R suites intentionally inspect the built HTML
// under `out/insights/*.html`. Running vitest BEFORE the build would fail
// those suites on a fresh clone. The ordering below therefore builds first,
// then runs tests against the fresh artefact.
//
// Fresh-clone invariant :  FRESH_CLONE + pnpm verify:a3r = GREEN.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";

const SEALED_FP =
  "4cefe8c6ed8917180870a37a3f3dbf5d2ff3d9395563dc683fc189b4e47b7e7b";

// PR21-FINAL-RELEASE-GATE §2 : verify:a3r is an EDITORIAL-REVIEW pipeline. It
// inspects draft articles (the corpus is 12/12 draft). We therefore run it in
// EXPLICIT_LOCAL_PREVIEW mode so the routes surface drafts for the tests to
// inspect. Production visibility is asserted separately by the
// `pr21-preview-visibility.test.ts` fixture set — this env is not applied to
// any consumer build.
const VERIFY_ENV = {
  ...process.env,
  CONTENT_PREVIEW_MODE: "true",
};

function run(cmd: string, args: string[]): number {
  const r = spawnSync(cmd, args, { stdio: "inherit", env: VERIFY_ENV });
  return r.status ?? 1;
}

function fail(msg: string): never {
  console.error(`[verify:a3r] FAIL — ${msg}`);
  process.exit(1);
}

function main(): void {
  // 1. Sealed contract fingerprint. A drifted contract fails immediately.
  const bytes = fs.readFileSync("contracts/content-document@1.schema.json", "utf8");
  const fp = createHash("sha256").update(bytes).digest("hex");
  if (fp !== SEALED_FP) {
    fail(
      `contract fingerprint mismatch : got ${fp} ; expected ${SEALED_FP}. A1R contract was modified — refuse to run A3R against a drifted contract.`,
    );
  }
  console.log(`[verify:a3r] contract fingerprint OK (${fp.slice(0, 12)}…)`);

  // 2. A3R corpus report (produces content/managed-corpus/A3R-REPORT.json).
  if (run("pnpm", ["tsx", "scripts/a3r-report.ts"]) !== 0) {
    fail("a3r-report emission failed");
  }
  if (!fs.existsSync("content/managed-corpus/A3R-REPORT.json")) {
    fail("A3R-REPORT.json missing after emission");
  }

  // 3. Typecheck. Fast fail before the heavier stages.
  if (run("pnpm", ["typecheck"]) !== 0) fail("typecheck failed");

  // 4. Producer + manifest gates.
  if (run("pnpm", ["content:verify"]) !== 0) fail("content:verify failed");
  if (run("pnpm", ["verify:product-manifest"]) !== 0) {
    fail("verify:product-manifest failed");
  }

  // 5. Clean any stale build output and rebuild deterministically. This step
  // is the fresh-clone guarantee : the tests further down will read fresh
  // artefacts even if a developer had a stale `out/` from an earlier local
  // session.
  fs.rmSync("out", { recursive: true, force: true });
  fs.rmSync(".next", { recursive: true, force: true });
  if (run("pnpm", ["build"]) !== 0) fail("build failed");

  // 6. Full test suite — runs AFTER the build so out/-dependent suites (a2r-*,
  // a1r-fidelity-corpus, insights-html-invariants, etc.) can inspect real
  // artefacts. This is the CI-authoritative order.
  if (run("pnpm", ["vitest", "run"]) !== 0) fail("test suite failed");

  // 7. JSON-LD structural + honesty gate on the built HTML.
  if (run("pnpm", ["validate:jsonld"]) !== 0) fail("validate:jsonld failed");

  // 8. A2R rerun on the fresh build (skip its inner build ; the one at step 5
  // is the single authoritative build for this run).
  const a2rStatus = spawnSync("pnpm", ["tsx", "scripts/verify-a2r.ts"], {
    stdio: "inherit",
    env: { ...VERIFY_ENV, A2R_SKIP_BUILD: "1" },
  });
  if ((a2rStatus.status ?? 1) !== 0) {
    fail("verify:a2r failed — A2R surface regression introduced by A3R work");
  }

  // 9. Git hygiene : no whitespace errors in the working tree.
  if (run("git", ["diff", "--check"]) !== 0) {
    fail("git diff --check reported whitespace errors");
  }

  console.log("[verify:a3r] GREEN");
}

main();
