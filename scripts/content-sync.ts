#!/usr/bin/env tsx
// content:sync — ingère une ref produit et émet un bundle content-to-content.
//
// USAGE : pnpm content:sync --product-ref <sha>
//
// CE SCRIPT EST LOCAL. Il n'est jamais invoqué par la CI. La CI n'exécute que `content:verify`
// (déterministe) contre les bundles déjà commités.

import path from "node:path";

import { runSync } from "@/lib/commit-to-content/sync";

function parseArgs(argv: string[]): { productRef: string } {
  const idx = argv.indexOf("--product-ref");
  if (idx === -1 || !argv[idx + 1]) {
    console.error("Usage: pnpm content:sync --product-ref <sha>");
    process.exit(2);
  }
  return { productRef: argv[idx + 1] };
}

function main() {
  const { productRef } = parseArgs(process.argv.slice(2));
  const siteRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

  const { bundle, bundlePath } = runSync({ siteRoot, productRef });

  console.log(`[content:sync] bundleId=${bundle.bundleId}`);
  console.log(`[content:sync] truthLevel=${bundle.truthLevel}`);
  console.log(`[content:sync] overallStatus=${bundle.overallStatus}`);
  console.log(`[content:sync] path=${path.relative(siteRoot, bundlePath)}`);
  console.log(`[content:sync] reason=${bundle.overallReason}`);
}

main();
