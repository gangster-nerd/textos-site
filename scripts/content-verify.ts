#!/usr/bin/env tsx
// content:verify — gate déterministe sur tous les bundles présents sous content-bundles/.
//
// Exécutable par la CI. Ne lit que le disque du dépôt (pas de git show, pas de réseau).
//
// Règles vérifiées :
//   1. Chaque bundle.json est parseable et cohérent avec publishability.json.
//   2. Un bundle CANDIDATE ne peut avoir overallStatus=PUBLIC_SAFE.
//   3. Un bundle dont declarationDiverged=true doit avoir overallStatus=BLOCKED.
//   4. Le SHA épinglé du bundle doit correspondre à IMPORT.md courant.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

import { verifyEditorialCandidates } from "@/lib/commit-to-content/editorial-verifier";
import { selfServeCtaGate } from "@/lib/commit-to-content/publishability";
import { loadPinnedManifest } from "@/lib/product-manifest/manifest-schema";
import type { ContentBundle } from "@/lib/commit-to-content/types";
import { loadCollection } from "@/lib/content/content-loader";
import { buildLinkGraph } from "@/lib/content/link-graph";

function siteRoot(): string {
  return path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
}

function loadBundle(dir: string): ContentBundle {
  const raw = JSON.parse(readFileSync(path.join(dir, "bundle.json"), "utf8"));
  return raw as ContentBundle;
}

function readPinnedShaFromImportMd(root: string): string {
  const md = readFileSync(path.join(root, "product-manifest", "IMPORT.md"), "utf8");
  const match = md.match(/`([0-9a-f]{40})`/);
  if (!match) throw new Error("SHA épinglé introuvable dans IMPORT.md.");
  return match[1];
}

function main() {
  const root = siteRoot();
  const bundlesDir = path.join(root, "content-bundles");
  if (!existsSync(bundlesDir)) {
    console.log("[content:verify] aucun bundle — RIEN À VÉRIFIER (ok).");
    return;
  }

  const pinnedSha = readPinnedShaFromImportMd(root);
  const failures: string[] = [];
  let count = 0;

  for (const name of readdirSync(bundlesDir)) {
    const dir = path.join(bundlesDir, name);
    if (!existsSync(path.join(dir, "bundle.json"))) continue;
    count++;

    let bundle: ContentBundle;
    try {
      bundle = loadBundle(dir);
    } catch (err) {
      failures.push(`${name}: bundle.json illisible — ${(err as Error).message}`);
      continue;
    }

    if (bundle.truthLevel === "CANDIDATE" && bundle.overallStatus === "PUBLIC_SAFE") {
      failures.push(`${name}: CANDIDATE ne peut pas être PUBLIC_SAFE (invariant 2).`);
    }
    if (bundle.capabilityDelta.declarationDiverged && bundle.overallStatus !== "BLOCKED") {
      failures.push(`${name}: declarationDiverged=true impose overallStatus=BLOCKED (invariant 3).`);
    }
    if (bundle.provenance.pinnedManifestSha !== pinnedSha) {
      failures.push(
        `${name}: pinnedManifestSha=${bundle.provenance.pinnedManifestSha} ≠ IMPORT.md=${pinnedSha}. Ré-synchroniser ce bundle.`,
      );
    }

    // Cohérence surface : le statut agrégé ne peut pas contredire un surface.status BLOCKED.
    const anyBlocked = bundle.surfaces.some((s) => s.status === "BLOCKED");
    if (anyBlocked && bundle.overallStatus === "PUBLIC_SAFE") {
      failures.push(`${name}: overallStatus=PUBLIC_SAFE alors qu'une surface est BLOCKED.`);
    }
    // Cohérence promotion-requests : chaque entrée clampée doit avoir une route non-vide.
    for (const p of bundle.promotionRequests) {
      if (p.promotionRequired && p.route === "NO_PROMOTION_REQUIRED") {
        failures.push(
          `${name}: promotion "${p.capabilityId}" clampée mais route=NO_PROMOTION_REQUIRED.`,
        );
      }
      if (!p.promotionRequired && p.route !== "NO_PROMOTION_REQUIRED") {
        failures.push(
          `${name}: promotion "${p.capabilityId}" non-clampée mais route=${p.route}.`,
        );
      }
    }
    // CTC-7 §4 : editorialCandidates DOIT être présent + bien formé. Aucun fallback [].
    if (!Array.isArray(bundle.editorialCandidates)) {
      failures.push(
        `${name}: bundle.editorialCandidates absent ou malformé (CTC-7 §4). Ré-exécuter content:sync après avoir corrigé les éditoriaux.`,
      );
    } else {
      // CTC-7 §4 : UNRECOGNIZED_SOURCE_REF impose overallStatus=BLOCKED.
      if (
        bundle.truthLevel === "UNRECOGNIZED_SOURCE_REF" &&
        bundle.overallStatus !== "BLOCKED"
      ) {
        failures.push(
          `${name}: truthLevel=UNRECOGNIZED_SOURCE_REF impose overallStatus=BLOCKED (obtenu ${bundle.overallStatus}).`,
        );
      }
      const selfServeEligible = selfServeCtaGate({
        manifest: loadPinnedManifest(root),
        activationProposed: false,
      }).eligible;
      const editorialFailures = verifyEditorialCandidates({
        bundleDir: dir,
        editorialCandidates: bundle.editorialCandidates,
        selfServeEligible,
        siteRoot: root,
        truthLevel: bundle.truthLevel,
        overallStatus: bundle.overallStatus,
      });
      for (const f of editorialFailures) {
        failures.push(`${name}: editorial ${f.editorial ?? "?"} — ${f.message}`);
      }
    }
  }

  // ─── CTC-ARTICLE-SYSTEM-1 §7 — link-graph gates across content collections. ───────────────
  const linkGraphDocs = [
    ...loadCollection("faq"),
    ...loadCollection("methodology"),
    ...loadCollection("insights"),
  ];
  const graph = buildLinkGraph(linkGraphDocs);
  for (const bl of graph.brokenLinks) {
    if (bl.reason === "unknown-route") {
      failures.push(`link-graph: ${bl.from} → ${bl.href} (unknown-route)`);
    } else if (bl.reason === "target-not-published") {
      failures.push(`link-graph: PROD ${bl.from} links to DRAFT ${bl.href}`);
    } else if (bl.reason === "self-link") {
      failures.push(`link-graph: ${bl.from} → ${bl.href} (self-link)`);
    }
  }
  for (const slug of graph.slugDuplicates) {
    failures.push(`link-graph: slug ${slug} appears in >1 document`);
  }
  for (const p of graph.canonicalDuplicates) {
    failures.push(`link-graph: canonical path ${p} appears in >1 document`);
  }
  for (const id of graph.orphanPublished) {
    failures.push(`link-graph: published article ${id} is orphan (no inbound)`);
  }

  if (failures.length > 0) {
    console.error(`[content:verify] ${failures.length} échec(s) sur ${count} bundle(s) :`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }

  console.log(`[content:verify] ${count} bundle(s) — GATES VERTS.`);
}

main();
