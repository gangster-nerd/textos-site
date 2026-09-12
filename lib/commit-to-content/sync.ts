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
import { buildPromotionRequests } from "./promotion-requests";
import { resolveProductRef, computePinnedDeclarationDigest } from "./resolve-product-ref";
import { scanEditorialCandidates } from "./editorial-registrar";
import { writeBundle, bundleDir as computeBundleDir } from "./bundle";
import type { BundleProvenance, ContentBundle } from "./types";

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
  const promotionRequests = buildPromotionRequests({ pinnedManifest, targetRef });

  const provenance: BundleProvenance = {
    sourceRepo: pinnedManifest.productRepository,
    sourceRef: targetRef,
    pinnedManifestSha: pinnedManifest.snapshotCommit,
    pinnedManifestChecksum: pinnedManifestChecksum(args.siteRoot),
    generatedAt: new Date().toISOString(),
    generatorVersion: GENERATOR_VERSION,
    siteHead: safeSiteHead(args.siteRoot),
  };

  const truthTag =
    targetRef.truthLevel === "AUTHORITATIVE_MAIN"
      ? "authoritative"
      : targetRef.truthLevel === "CANDIDATE"
        ? "candidate"
        : "unrecognized";

  // Découverte des candidats éditoriaux existants (authored par l'opérateur). Hash + frontmatter
  // sont capturés maintenant pour rendre `content:verify` capable de détecter toute
  // modification post-génération.
  const provisionalBundleDir = computeBundleDir(args.siteRoot, {
    truthLevel: targetRef.truthLevel,
    provenance,
  } as ContentBundle);
  const scan = scanEditorialCandidates({ bundleDir: provisionalBundleDir });
  if (scan.failures.length > 0) {
    const detail = scan.failures.map((f) => `  - ${f.path}: ${f.message}`).join("\n");
    throw new Error(
      `Frontmatter éditorial invalide (CTC-7 strict) — corriger avant re-sync :\n${detail}`,
    );
  }
  const editorialCandidates = scan.candidates;

  const bundle: ContentBundle = {
    bundleId: `${truthTag}-${targetRef.shortSha}`,
    truthLevel: targetRef.truthLevel,
    provenance,
    capabilityDelta: delta,
    ...decision,
    opportunities,
    promotionRequests,
    editorialCandidates,
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

// Le helper legacy `truthLevelOfRef(sha, knownCandidate)` a été RETIRÉ en CTC-7. Il
// classifiait toute ref non-candidat comme AUTHORITATIVE_MAIN, ce qui contredit l'invariant
// whitelist. La seule politique de truth-level est désormais `resolveTruthLevel` interne à
// resolve-product-ref.ts (whitelist explicite + fail-closed sur UNRECOGNIZED_SOURCE_REF).
