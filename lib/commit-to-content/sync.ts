// Orchestration `content:sync` — assemblage pur, sans I/O réseau.
//
// Pipeline :
//   1. charger le manifeste épinglé (byte-vérifié) ;
//   2. calculer le digest de la déclaration source à l'épingle ;
//   3. résoudre la ref cible (git show sur le clone produit local) ;
//   4. calculer le delta (source déclaration cible vs déclaration épinglée) ;
//   5. décider la publishability (4 états, invariants durs) ;
//   6. sérialiser le bundle sur disque + squelettes déterministes.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import { loadPinnedManifest } from "@/lib/product-manifest/manifest-schema";

import { computeCapabilityDelta } from "./compute-delta";
import { decidePublishability } from "./publishability";
import { detectOpportunities } from "./opportunities";
import { resolveProductRef, computePinnedDeclarationDigest } from "./resolve-product-ref";
import { writeBundle } from "./bundle";
import type { BundleProvenance, ContentBundle, TruthLevel } from "./types";

export const GENERATOR_VERSION = "commit-to-content@v1";

export interface SyncArgs {
  siteRoot: string;
  productRef: string; // sha, tag ou ref
}

export interface SyncResult {
  bundle: ContentBundle;
  bundlePath: string;
}

export function runSync(args: SyncArgs): SyncResult {
  const pinnedManifest = loadPinnedManifest(args.siteRoot);
  const { pinnedSha, digest: pinnedDigest } = computePinnedDeclarationDigest();

  // Cohérence entre le SHA épinglé dans IMPORT.md et le manifeste JSON. Une divergence ici
  // signifie que quelqu'un a modifié un des deux sans l'autre — refuser explicitement.
  if (pinnedSha !== pinnedManifest.snapshotCommit) {
    throw new Error(
      `Incohérence provenance : IMPORT.md pointe ${pinnedSha} mais manifest.snapshotCommit=${pinnedManifest.snapshotCommit}.`,
    );
  }

  const targetRef = resolveProductRef({
    ref: args.productRef,
    pinnedDeclarationDigest: pinnedDigest,
  });

  const delta = computeCapabilityDelta({ pinnedManifest, targetRef });
  const decision = decidePublishability({ targetRef, delta, pinnedManifest });
  const opportunities = detectOpportunities({ pinnedManifest, targetRef, delta });

  const provenance: BundleProvenance = {
    sourceRepo: pinnedManifest.productRepository,
    sourceRef: targetRef,
    pinnedManifestSha: pinnedManifest.snapshotCommit,
    pinnedManifestChecksum: pinnedManifestChecksum(args.siteRoot),
    generatedAt: new Date().toISOString(),
    generatorVersion: GENERATOR_VERSION,
    siteHead: safeSiteHead(args.siteRoot),
  };

  const truthTag = targetRef.truthLevel === "AUTHORITATIVE_MAIN" ? "authoritative" : "candidate";
  const bundle: ContentBundle = {
    bundleId: `${truthTag}-${targetRef.shortSha}`,
    truthLevel: targetRef.truthLevel,
    provenance,
    capabilityDelta: delta,
    ...decision,
    opportunities,
  };

  const bundlePath = writeBundle(args.siteRoot, bundle);
  return { bundle, bundlePath };
}

function pinnedManifestChecksum(siteRoot: string): string {
  const file = path.join(siteRoot, "product-manifest", "textos-v0.capability-manifest.json.sha256");
  return readFileSync(file, "utf8").trim().split(/\s+/)[0];
}

function safeSiteHead(siteRoot: string): string | null {
  try {
    return execFileSync("git", ["-C", siteRoot, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

export function truthLevelOfRef(sha: string, knownCandidate: string): TruthLevel {
  return sha === knownCandidate ? "CANDIDATE" : "AUTHORITATIVE_MAIN";
}
