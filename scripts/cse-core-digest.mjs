#!/usr/bin/env node
// Deterministic PRODUCT_CORE digest for the Content Surface Engine.
// Scope: PRODUCT_CORE modules as classified in the audit
// /Users/marc/.claude/plans/tu-es-le-principal-jolly-pebble.md §B.
// Output: writes or verifies lib/content-surface-engine/CSE_CORE_MANIFEST.json.
// Independent of mtimes and filesystem enumeration order.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

// Immutable base SHA: the origin/main parent from which CMO incubation
// started. NEVER auto-derived from HEAD — that would produce a self-
// referential manifest whose digest changes with every rewrite of its
// hosting commit. The candidateCommitSha of any future promotion belongs
// to the promotion receipt, not to this base manifest.
const SOURCE_BASE_SHA = "1f4057b15e6c790b65b7fb2dd5b674fc398a917a";

// Fixed PRODUCT_CORE file set. Sorted lexicographically. This list is
// the single source of truth for the digest scope — the --check mode
// asserts it matches the manifest on disk exactly.
// Any addition/removal is a promotion event and must be paired with
// an ADR in textos-v0.
const PRODUCT_CORE_FILES = [
  "lib/content-surface-engine/authority/compile-authority.ts",
  "lib/content-surface-engine/authority/editorial-identity-policy.ts",
  "lib/content-surface-engine/composition/provenance-authority.ts",
  "lib/content-surface-engine/composition/resolve-content-surface.ts",
  "lib/content-surface-engine/conformance/content-pass.ts",
  "lib/content-surface-engine/conformance/fidelity-pass/index.ts",
  "lib/content-surface-engine/conformance/fidelity-pass/markdown-evaluator.ts",
  "lib/content-surface-engine/conformance/fidelity-pass/result.ts",
  "lib/content-surface-engine/conformance/fixtures.ts",
  "lib/content-surface-engine/contract/content-document.ts",
  "lib/content-surface-engine/contract/resolved-content-surface.ts",
  "lib/content-surface-engine/contract/surface-policy.ts",
  "lib/content-surface-engine/lifecycle/lifecycle.ts",
  "lib/content-surface-engine/link-graph/link-graph.ts",
  "lib/content-surface-engine/producers/markdown/content-document-to-mdast.ts",
  "lib/content-surface-engine/producers/markdown/fidelity-oracle.ts",
  "lib/content-surface-engine/producers/markdown/mdast-to-content-document.ts",
  "lib/content-surface-engine/producers/markdown/normalize-mdast.ts",
  "lib/content-surface-engine/producers/markdown/parse-markdown.ts",
  "lib/content-surface-engine/publication/indexable.ts",
  "lib/content-surface-engine/publication/publication-pass.ts",
  "lib/content-surface-engine/receipt/receipt.ts",
];

// Canonical ContentDocument contract fingerprint = sha256 of the JSON
// Schema file already used by scripts/a3r-report.ts as CONTRACT_FINGERPRINT.
// That schema is the versioned wire contract; hashing version labels is
// NOT the same thing and must not be presented as it.
const CONTENT_DOCUMENT_CONTRACT_SCHEMA_PATH = "contracts/content-document@1.schema.json";

// Version identifier tuple for the CSE surface contract set. Distinct
// from the ContentDocument fingerprint above: this covers the trio of
// public schema-version literals whose change constitutes a breaking
// event for the resolved-surface pipeline.
const SURFACE_CONTRACT_VERSIONS = [
  { id: "content-document@1", declaringFile: "lib/content-surface-engine/contract/content-document.ts" },
  { id: "surface-policy@1", declaringFile: "lib/content-surface-engine/contract/surface-policy.ts" },
  { id: "resolved-content-surface@1", declaringFile: "lib/content-surface-engine/contract/resolved-content-surface.ts" },
];

const MANIFEST_PATH = resolve(REPO_ROOT, "lib/content-surface-engine/CSE_CORE_MANIFEST.json");

function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function readBytes(relPath) {
  return readFileSync(resolve(REPO_ROOT, relPath));
}

function computeContentDocumentContractFingerprint() {
  return sha256Hex(readBytes(CONTENT_DOCUMENT_CONTRACT_SCHEMA_PATH));
}

function computeSurfaceContractSetDigest() {
  for (const { id, declaringFile } of SURFACE_CONTRACT_VERSIONS) {
    const src = readBytes(declaringFile).toString("utf8");
    if (!src.includes(`"${id}"`)) {
      throw new Error(`Surface contract set: literal ${id} not found in ${declaringFile}`);
    }
  }
  const canonical = SURFACE_CONTRACT_VERSIONS
    .map((entry) => `${entry.id}\t${entry.declaringFile}`)
    .join("\n") + "\n";
  return sha256Hex(Buffer.from(canonical, "utf8"));
}

function assertCanonicalScopeList(list) {
  if (!Array.isArray(list)) throw new Error("scope list must be an array");
  const sorted = [...list].sort();
  for (let i = 0; i < list.length; i++) {
    if (list[i] !== sorted[i]) {
      throw new Error(`scope list is not in canonical sorted order at index ${i}: got ${list[i]}, expected ${sorted[i]}`);
    }
  }
  const seen = new Set();
  for (const p of list) {
    if (seen.has(p)) throw new Error(`duplicate path in scope list: ${p}`);
    seen.add(p);
  }
}

function computeDigest() {
  assertCanonicalScopeList(PRODUCT_CORE_FILES);
  const perFile = PRODUCT_CORE_FILES.map((path) => ({ path, sha256: sha256Hex(readBytes(path)) }));
  const canonical = perFile.map(({ path, sha256 }) => `${sha256}  ${path}`).join("\n") + "\n";
  const aggregate = sha256Hex(Buffer.from(canonical, "utf8"));
  return { files: perFile, aggregate };
}

function repoOrigin() {
  try {
    return execSync("git config --get remote.origin.url", { cwd: REPO_ROOT }).toString().trim();
  } catch {
    return "";
  }
}

function buildManifest() {
  const { files, aggregate } = computeDigest();
  const contentDocumentContractFingerprint = computeContentDocumentContractFingerprint();
  const surfaceContractSetDigest = computeSurfaceContractSetDigest();
  return {
    manifestVersion: "cse-core-manifest@1",
    scope: "PRODUCT_CORE",
    source: {
      repository: repoOrigin(),
      baseSha: SOURCE_BASE_SHA,
      baseShaNote:
        "baseSha is the origin/main parent from which CMO incubation started. It is NOT the SHA of the commit hosting this manifest; that would be self-referential. A future promotion-receipt (post CSE-PROMOTION-1) carries candidateCommitSha separately.",
    },
    contentDocumentContractFingerprint,
    contentDocumentContractFingerprintSource: {
      schemaPath: CONTENT_DOCUMENT_CONTRACT_SCHEMA_PATH,
      algorithm: "sha256(file bytes)",
      note:
        "Canonical fingerprint of the ContentDocument wire contract. Matches scripts/a3r-report.ts CONTRACT_FINGERPRINT.",
    },
    surfaceContractSetDigest,
    surfaceContractSetDigestNote:
      "Digest over the three surface-contract version literals (content-document@1, surface-policy@1, resolved-content-surface@1). This is a set identifier, NOT the ContentDocument contract fingerprint.",
    contractVersions: SURFACE_CONTRACT_VERSIONS.map((v) => v.id),
    aggregateDigest: aggregate,
    fileCount: files.length,
    files,
    reproduction: {
      command: "node scripts/cse-core-digest.mjs --check",
      algorithm: "sha256",
      canonicalization:
        "per file: sha256(file bytes); aggregate: sha256(join('\\n', sorted('<sha>  <path>')) + '\\n'). --check also asserts scope list matches exactly (no missing, extra, duplicate, or non-canonical ordering).",
    },
  };
}

function stableStringify(obj) {
  return JSON.stringify(obj, null, 2) + "\n";
}

function check() {
  const onDisk = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  const problems = [];

  const expectedScope = [...PRODUCT_CORE_FILES];
  const observedScope = Array.isArray(onDisk.files) ? onDisk.files.map((f) => f.path) : [];

  if (observedScope.length !== expectedScope.length) {
    problems.push(`fileCount mismatch: manifest lists ${observedScope.length}, script expects ${expectedScope.length}`);
  }
  const expectedSet = new Set(expectedScope);
  const observedSet = new Set(observedScope);
  for (const p of expectedScope) if (!observedSet.has(p)) problems.push(`missing in manifest: ${p}`);
  for (const p of observedScope) if (!expectedSet.has(p)) problems.push(`unexpected in manifest: ${p}`);
  const seen = new Set();
  for (const p of observedScope) {
    if (seen.has(p)) problems.push(`duplicate in manifest: ${p}`);
    seen.add(p);
  }
  for (let i = 0; i < Math.min(observedScope.length, expectedScope.length); i++) {
    if (observedScope[i] !== expectedScope[i]) {
      problems.push(`non-canonical order at index ${i}: manifest=${observedScope[i]} expected=${expectedScope[i]}`);
      break;
    }
  }

  const recomputedPerFile = new Map(PRODUCT_CORE_FILES.map((p) => [p, sha256Hex(readBytes(p))]));
  for (const f of onDisk.files || []) {
    const expected = recomputedPerFile.get(f.path);
    if (expected && expected !== f.sha256) {
      problems.push(`sha256 mismatch: ${f.path} manifest=${f.sha256} recomputed=${expected}`);
    }
  }

  const { aggregate } = computeDigest();
  if (onDisk.aggregateDigest !== aggregate) {
    problems.push(`aggregateDigest mismatch: manifest=${onDisk.aggregateDigest} recomputed=${aggregate}`);
  }

  const cdFp = computeContentDocumentContractFingerprint();
  if (onDisk.contentDocumentContractFingerprint !== cdFp) {
    problems.push(`contentDocumentContractFingerprint mismatch: manifest=${onDisk.contentDocumentContractFingerprint} recomputed=${cdFp}`);
  }
  const setDigest = computeSurfaceContractSetDigest();
  if (onDisk.surfaceContractSetDigest !== setDigest) {
    problems.push(`surfaceContractSetDigest mismatch: manifest=${onDisk.surfaceContractSetDigest} recomputed=${setDigest}`);
  }

  if (onDisk.source?.baseSha !== SOURCE_BASE_SHA) {
    problems.push(`source.baseSha mismatch: manifest=${onDisk.source?.baseSha} script=${SOURCE_BASE_SHA}`);
  }

  if (problems.length > 0) {
    console.error("CSE_CORE digest verification FAILED");
    for (const line of problems) console.error(`  - ${line}`);
    process.exit(1);
  }
  console.log(`CSE_CORE digest OK  aggregate=${aggregate}  files=${PRODUCT_CORE_FILES.length}  cd=${cdFp}  set=${setDigest}`);
}

const mode = process.argv[2];

if (mode === "--check") {
  check();
  process.exit(0);
}

if (mode === "--print") {
  process.stdout.write(stableStringify(buildManifest()));
  process.exit(0);
}

const manifest = buildManifest();
writeFileSync(MANIFEST_PATH, stableStringify(manifest));
console.log(`Wrote ${MANIFEST_PATH}`);
console.log(`  aggregate=${manifest.aggregateDigest}`);
console.log(`  files=${manifest.fileCount}`);
console.log(`  contentDocumentContractFingerprint=${manifest.contentDocumentContractFingerprint}`);
console.log(`  surfaceContractSetDigest=${manifest.surfaceContractSetDigest}`);
console.log(`  baseSha=${manifest.source.baseSha}`);
