#!/usr/bin/env tsx
// content:status — lit les bundles présents et rend un état lisible par un humain.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

import type { ContentBundle } from "@/lib/commit-to-content/types";

function siteRoot(): string {
  return path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
}

function main() {
  const root = siteRoot();
  const bundlesDir = path.join(root, "content-bundles");
  if (!existsSync(bundlesDir)) {
    console.log("Aucun bundle content-to-content.");
    return;
  }

  const entries: ContentBundle[] = [];
  for (const name of readdirSync(bundlesDir)) {
    const file = path.join(bundlesDir, name, "bundle.json");
    if (!existsSync(file)) continue;
    entries.push(JSON.parse(readFileSync(file, "utf8")) as ContentBundle);
  }

  if (entries.length === 0) {
    console.log("Aucun bundle content-to-content.");
    return;
  }

  entries.sort((a, b) => a.bundleId.localeCompare(b.bundleId));

  console.log(`# Content bundles (${entries.length})`);
  console.log("");
  for (const bundle of entries) {
    console.log(`## ${bundle.bundleId}`);
    console.log(`- truthLevel: **${bundle.truthLevel}**`);
    console.log(`- sourceProductRef: \`${bundle.provenance.sourceRef.sha}\``);
    console.log(`- overallStatus: **${bundle.overallStatus}**`);
    console.log(`- reason: ${bundle.overallReason}`);
    console.log("");
    console.log("  Surfaces :");
    for (const s of bundle.surfaces) {
      console.log(`  - \`${s.surface}\` → **${s.status}** — ${s.statusReason}`);
    }
    console.log("");
    console.log("  Gates :");
    for (const [name, g] of Object.entries(bundle.gates)) {
      console.log(`  - \`${name}\`: **${g.status}** — ${g.detail}`);
    }
    console.log("");
    const required = bundle.promotionRequests.filter((p) => p.promotionRequired);
    if (required.length > 0) {
      console.log(`  Promotion requests (${required.length}) :`);
      for (const p of required) {
        console.log(
          `  - \`${p.capabilityId}\` → **${p.route}** (owner: ${p.requiredOwner}) — ${p.blockingReason}`,
        );
      }
      console.log("");
    }
  }
}

main();
