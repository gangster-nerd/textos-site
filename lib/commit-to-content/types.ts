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
import type { ContentOpportunity } from "./opportunities";
import type { PromotionRequest } from "./promotion-requests";

// UNRECOGNIZED_SOURCE_REF — fail-closed pour toute ref non explicitement whitelistée par le
// cycle courant. Un tel bundle ne peut JAMAIS atteindre PUBLIC_SAFE ni REQUIRES_HUMAN_REVIEW ;
// il reste BLOCKED en overallStatus. C'est la correction P0 de la review CTO CTC-6 : ne
// jamais traiter une ref arbitraire comme vérité produit par défaut.
export const TRUTH_LEVELS = [
  "AUTHORITATIVE_MAIN",
  "CANDIDATE",
  "UNRECOGNIZED_SOURCE_REF",
] as const;
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
    maturityGate: { status: "green" | "red"; detail: string };
  };
  opportunities: ContentOpportunity[];
  promotionRequests: PromotionRequest[];
  editorialCandidates: EditorialCandidate[];
}

// Candidat éditorial GOUVERNÉ par le bundle : son sha256 est vérifié à `content:verify`. Toute
// modification hors régénération casse le gate. Toute présence de fichier sous editorial/ non
// référencée dans la liste est rejetée.
export interface EditorialCandidate {
  path: string; // relatif au bundle
  sha256: string;
  surface: string;
  classification:
    | "CAPABILITY_CHANGE"
    | "PRODUCT_KNOWLEDGE_DELTA"
    | "MARKETING_OPPORTUNITY_DELTA"
    | "CONTENT_COVERAGE_GAP"
    | "NARRATIVE_DRIFT"
    | "COPY_CLARIFICATION"
    | "NO_CHANGE"
    | "LABS_MATURITY_CHANGE";
  sourceProductRef: string;
  truthLevel: TruthLevel;
  basisCapabilityIds: string[];
  basisClaimIds: string[];
  disclosureAuthority: string;
  proposedPublishability: PublishabilityStatus;
  language: "en" | "fr";
  humanReviewRequired: boolean;
}

export interface ResolvedManifestBundle {
  manifest: ProductManifest;
  digest: string;
}
