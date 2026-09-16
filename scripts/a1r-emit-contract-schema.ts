#!/usr/bin/env tsx
// A1R Phase 1 — publish the canonical machine-readable ContentDocument@1 artifact.
//
// Exactly ONE derivation path: Zod 4's native `z.toJSONSchema` over the effective
// schema declared in `lib/content-surface-engine/contract/content-document.ts`. No
// third-party translator, no hand-maintained duplicate.
//
// Canonical bytes:
//   - UTF-8
//   - object keys sorted alphabetically at every depth
//   - two-space indent
//   - single trailing LF
//   - no environment-dependent values (no timestamps, no git SHA, no build id)
//
// Byte-identical output for byte-identical schema. The consumer (ShortsOS, future
// vendorers) hashes the file to pin the contract.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

import { ContentDocumentSchema } from "@/lib/content-surface-engine/contract/content-document";

const ARTIFACT_PATH = "contracts/content-document@1.schema.json";

/** Recursively sort object keys so serialization is deterministic. */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

function main(): void {
  const raw = z.toJSONSchema(ContentDocumentSchema, {
    // "input" projects the type as seen by producers (before default/transform),
    // which is what a downstream vendorer verifies against.
    io: "input",
    // Refusal on unrepresentable constructs — no silent lossy conversion.
    unrepresentable: "throw",
  }) as Record<string, unknown>;

  const canonical = sortKeys(raw);
  const bytes = JSON.stringify(canonical, null, 2) + "\n";

  if (!existsSync("contracts")) mkdirSync("contracts", { recursive: true });
  writeFileSync(ARTIFACT_PATH, bytes, "utf8");

  const fingerprint = createHash("sha256").update(bytes).digest("hex");

  const rel = path.relative(process.cwd(), ARTIFACT_PATH);
  console.log(`[a1r-emit-contract-schema] wrote ${rel} (${bytes.length} bytes)`);
  console.log(`[a1r-emit-contract-schema] CONTRACT_FINGERPRINT=${fingerprint}`);
}

main();
