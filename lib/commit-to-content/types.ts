// Contrats de commit-to-content — V1.
//
// Deux axes ORTHOGONAUX à conserver rigoureusement séparés :
//
//   truthLevel  = origine de la vérité produit lue pendant `content:sync`.
//                 AUTHORITATIVE_MAIN = product main (peut être publié après revue).
//                 CANDIDATE          = ref R2 non intégré (préparé, jamais publié).
//
//   publishability = décision par surface impactée, produite par `content:verify`.
//                    PUBLIC_SAFE            = gates déterministes verts, PO peut merger.
//                    REQUIRES_HUMAN_REVIEW  = gates verts mais changement rédactionnel non trivial.
//                    WAITING_FOR_PRODUCT_MAIN = la vérité provient d'une source CANDIDATE.
//                    BLOCKED                = gate déterministe rouge (drift, provenance, safety).
//
// Un candidat issu d'une source CANDIDATE ne peut PAS devenir PUBLIC_SAFE, quel que soit
// le résultat des autres gates. Cette invariant est vérifié par `publishability.ts` et par
// un test unitaire.

import type { ProductManifest } from "@/lib/product-manifest/manifest-schema";

export const TRUTH_LEVELS = ["AUTHORITATIVE_MAIN", "CANDIDATE"] as const;
export type TruthLevel = (typeof TRUTH_LEVELS)[number];

export const PUBLISHABILITY_STATES = [
  "PUBLIC_SAFE",
  "REQUIRES_HUMAN_REVIEW",
  "WAITING_FOR_PRODUCT_MAIN",
  "BLOCKED",
] as const;
export type PublishabilityStatus = (typeof PUBLISHABILITY_STATES)[number];

// Une "surface" ici est un point d'entrée éditorial (homepage, faq, methodology, ...). Les
// noms sont alignés sur PUBLIC_SURFACES du manifest, plus quelques surfaces éditoriales internes
// (changelog, glossary, geo) que la spec content-pipeline mentionne.
export const IMPACT_SURFACES = [
  "homepage",
  "product_proof",
  "faq",
  "methodology",
  "changelog",
  "glossary",
  "request_measurement",
  "geo",
  "schema_org",
  "cta_registry",
] as const;
export type ImpactSurface = (typeof IMPACT_SURFACES)[number];

export interface ProductSourceRef {
  sha: string; // SHA-40
  shortSha: string; // 7 hex
  truthLevel: TruthLevel;
  // Digest reproductible du fichier source de déclaration lu à cette ref.
  declarationDigest: string; // sha256(hex)
  // La ref pointée est-elle byte-identique au manifeste épinglé côté site ?
  matchesPinnedManifest: boolean;
}

export interface CapabilityDelta {
  addedEntityIds: string[];
  removedEntityIds: string[];
  changedEntityIds: string[]; // implementation ou publication status changé
  publicationStatusChanges: Array<{
    entityId: string;
    from: string | null;
    to: string;
  }>;
  // Vrai si le fichier de déclaration TypeScript source a divergé entre le manifeste épinglé et
  // la ref demandée. Si vrai, le pipeline REFUSE de publier et exige un ré-import via
  // `gh run download` (procédure IMPORT.md). C'est intentionnel : on ne recalcule pas la vérité
  // produit à partir d'une source non attestée.
  declarationDiverged: boolean;
}

export interface SurfaceImpact {
  surface: ImpactSurface;
  reason: string;
  affectedFiles: string[];
  candidateSkeletonPath: string | null;
  status: PublishabilityStatus;
  statusReason: string;
}

export interface BundleProvenance {
  sourceRepo: string;
  sourceRef: ProductSourceRef;
  pinnedManifestSha: string; // le snapshotCommit du manifest actuellement épinglé côté site
  pinnedManifestChecksum: string;
  generatedAt: string; // ISO
  generatorVersion: string; // "commit-to-content@v1"
  siteHead: string | null;
}

export interface ContentBundle {
  bundleId: string; // "<truth>-<shortSha>-<yyyymmddhhmmss>"
  truthLevel: TruthLevel;
  provenance: BundleProvenance;
  capabilityDelta: CapabilityDelta;
  surfaces: SurfaceImpact[];
  overallStatus: PublishabilityStatus;
  overallReason: string;
  // Portes agrégées, indépendantes des surfaces (schema, provenance globale, drift).
  gates: {
    manifestDrift: { status: "green" | "red"; detail: string };
    declarationIntegrity: { status: "green" | "red"; detail: string };
    truthLevelGate: { status: "green" | "red"; detail: string };
    selfServeCtaGate: { status: "green" | "red"; detail: string };
  };
}

export interface ResolvedManifestBundle {
  manifest: ProductManifest;
  digest: string;
}
