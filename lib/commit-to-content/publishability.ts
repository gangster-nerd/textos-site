// Décideur déterministe de publishability — 4 états, sans intelligence artificielle.
//
// Trois invariants NON NÉGOCIABLES :
//
//   1. truthLevel=CANDIDATE ⇒ overallStatus ∈ {WAITING_FOR_PRODUCT_MAIN, BLOCKED}.
//      Une source R2 non intégrée ne peut PAS produire PUBLIC_SAFE, même si tous les autres gates
//      passent. Test unitaire : `candidate cannot be PUBLIC_SAFE`.
//
//   2. declarationDiverged ⇒ overallStatus = BLOCKED. Un delta silencieux sur la déclaration source
//      dénote un ré-import manquant ; publier reviendrait à faire confiance à un manifeste
//      potentiellement périmé.
//
//   3. Une capacité `internal_only` du manifeste ne peut JAMAIS déclencher l'activation d'un CTA
//      self-serve public. Test unitaire : `internal_only self-serve → NO public CTA`.

import type { ProductManifest } from "@/lib/product-manifest/manifest-schema";

import {
  MATURITY_COPY_CONTRACT,
  effectiveMaturityWithAuthority,
  manifestCeiling,
} from "./maturity";
import { MATURITY_DECLARATIONS } from "./maturity-declarations";
import type {
  CapabilityDelta,
  ImpactSurface,
  ProductSourceRef,
  PublishabilityStatus,
  SurfaceImpact,
  ContentBundle,
} from "./types";

const NARRATIVE_REFRESH_SURFACES: ImpactSurface[] = [
  "homepage",
  "product_proof",
  "faq",
  "methodology",
];

export function decidePublishability(args: {
  targetRef: ProductSourceRef;
  delta: CapabilityDelta;
  pinnedManifest: ProductManifest;
}): Pick<ContentBundle, "surfaces" | "overallStatus" | "overallReason" | "gates"> {
  const { targetRef, delta, pinnedManifest } = args;

  const gates: ContentBundle["gates"] = {
    manifestDrift: targetRef.matchesPinnedManifest
      ? { status: "green", detail: "La ref demandée est byte-identique au manifeste épinglé." }
      : {
          status: "red",
          detail:
            "La déclaration source a divergé du manifeste épinglé. Ré-import requis via `gh run download` (procédure IMPORT.md).",
        },
    declarationIntegrity: delta.declarationDiverged
      ? { status: "red", detail: "declarationDiverged=true — voir manifestDrift." }
      : { status: "green", detail: "Digest de la déclaration source conforme à l'épinglé." },
    truthLevelGate:
      targetRef.truthLevel === "AUTHORITATIVE_MAIN"
        ? { status: "green", detail: "Source AUTHORITATIVE_MAIN." }
        : targetRef.truthLevel === "CANDIDATE"
          ? {
              status: "green",
              detail:
                "Source CANDIDATE — bundle préparé pour déblocage futur, non publiable en l'état.",
            }
          : {
              status: "red",
              detail:
                "Source UNRECOGNIZED_SOURCE_REF — ref hors whitelist du cycle courant. Fail closed.",
            },
    selfServeCtaGate: selfServeCtaGate(pinnedManifest),
    maturityGate: maturityGate(pinnedManifest),
  };

  const surfaceStatuses: SurfaceImpact[] = NARRATIVE_REFRESH_SURFACES.map((surface) =>
    computeSurfaceImpact(surface, targetRef, delta, gates),
  );

  // Décision agrégée
  let overallStatus: PublishabilityStatus;
  let overallReason: string;

  if (targetRef.truthLevel === "UNRECOGNIZED_SOURCE_REF") {
    overallStatus = "BLOCKED";
    overallReason =
      "Source ref hors whitelist du cycle courant. Le pipeline refuse fail-closed toute promotion depuis une ref non explicitement autoritative — même byte-identique à l'épingle.";
  } else if (delta.declarationDiverged) {
    overallStatus = "BLOCKED";
    overallReason =
      "La déclaration source a divergé du manifeste épinglé. Aucun changement rédactionnel ne peut être proposé tant que le manifeste n'est pas ré-importé (procédure IMPORT.md).";
  } else if (targetRef.truthLevel === "CANDIDATE") {
    overallStatus = "WAITING_FOR_PRODUCT_MAIN";
    overallReason =
      "Source CANDIDATE (R2 non intégré à main). Bundle préparé et vérifié ; publication conditionnée à l'intégration produit main.";
  } else if (gates.selfServeCtaGate.status === "red") {
    overallStatus = "BLOCKED";
    overallReason = gates.selfServeCtaGate.detail;
  } else {
    // Pas de delta positif de capacités : la refresh reste éditoriale (narrative modernization
    // dans les bornes déjà autorisées). Requiert une revue humaine — pas de PUBLIC_SAFE
    // automatique.
    overallStatus = "REQUIRES_HUMAN_REVIEW";
    overallReason =
      "Delta de capacités byte-identique au manifeste épinglé. Le bundle propose une refresh éditoriale dans les bornes déjà commercialisables ; revue PO requise avant merge.";
  }

  return { surfaces: surfaceStatuses, overallStatus, overallReason, gates };
}

function computeSurfaceImpact(
  surface: ImpactSurface,
  targetRef: ProductSourceRef,
  delta: CapabilityDelta,
  gates: ContentBundle["gates"],
): SurfaceImpact {
  const affectedFiles = affectedFilesFor(surface);
  const skeletonPath = `candidates/${surface}.md`;

  let status: PublishabilityStatus;
  let reason: string;

  if (targetRef.truthLevel === "UNRECOGNIZED_SOURCE_REF") {
    status = "BLOCKED";
    reason = "Ref hors whitelist du cycle courant — fail closed.";
  } else if (delta.declarationDiverged) {
    status = "BLOCKED";
    reason = "Bloqué par declarationIntegrity — ré-import manifeste requis.";
  } else if (targetRef.truthLevel === "CANDIDATE") {
    status = "WAITING_FOR_PRODUCT_MAIN";
    reason =
      "Source CANDIDATE — squelette candidat émis, publication conditionnée à l'intégration produit main.";
  } else if (gates.selfServeCtaGate.status === "red") {
    status = "BLOCKED";
    reason = gates.selfServeCtaGate.detail;
  } else {
    status = "REQUIRES_HUMAN_REVIEW";
    reason =
      "Squelette candidat émis dans les bornes commercialisables actuelles. PO doit approuver la rédaction éditoriale.";
  }

  return {
    surface,
    reason: `Refresh narrative candidate for ${surface}.`,
    affectedFiles,
    candidateSkeletonPath: skeletonPath,
    status,
    statusReason: reason,
  };
}

function affectedFilesFor(surface: ImpactSurface): string[] {
  switch (surface) {
    case "homepage":
      return ["app/page.tsx", "components/site/**"];
    case "product_proof":
      return ["components/product/**", "lib/product-proof/**"];
    case "faq":
      return ["content/faq/**"];
    case "methodology":
      return ["content/methodology/**"];
    default:
      return [];
  }
}

// Contrat réel de l'éligibilité self-serve — RÉÉCRIT en CTC-6 (P0 CTO).
//
// truth-check / grounded-truth-check / structured-generation NE PROUVENT PAS l'onboarding
// self-serve. Le contrat exige les TROIS capacités suivantes, TOUTES autoritatives et
// suffisamment publiques :
export const SELF_SERVE_REQUIRED_CAPABILITIES = [
  "self-serve-onboarding",
  "authenticated-product-entry",
  "ui-measurement-launch",
] as const;

export interface SelfServeGateInput {
  manifest: ProductManifest;
  // `true` quand un candidat éditorial propose activement l'activation d'un CTA self-serve.
  // Si aucun candidat ne le propose, le gate reste GREEN avec eligible=false (fail-closed
  // par défaut, comme mandaté par le contrat CTC-6).
  activationProposed?: boolean;
}

export interface SelfServeGateOutput {
  status: "green" | "red";
  detail: string;
  eligible: boolean;
  activationProposed: boolean;
  missingCapabilities: string[];
}

export function selfServeCtaGate(
  input: ProductManifest | SelfServeGateInput,
): SelfServeGateOutput {
  const manifest: ProductManifest = "entities" in input ? input : input.manifest;
  const activationProposed =
    "entities" in input ? false : Boolean(input.activationProposed);

  const missing: string[] = [];
  for (const id of SELF_SERVE_REQUIRED_CAPABILITIES) {
    const entity = manifest.entities.find((e) => e.id === id);
    if (!entity) {
      missing.push(`${id} (absent du manifeste)`);
      continue;
    }
    if (entity.publicationStatus !== "public_marketable") {
      missing.push(`${id} (publicationStatus=${entity.publicationStatus})`);
    }
  }

  const eligible = missing.length === 0;

  if (activationProposed && !eligible) {
    return {
      status: "red",
      detail: `Activation self-serve proposée mais capacités requises manquantes : ${missing.join(", ")}. Fail-closed.`,
      eligible,
      activationProposed,
      missingCapabilities: missing,
    };
  }
  if (activationProposed && eligible) {
    return {
      status: "green",
      detail:
        "Toutes les capacités requises sont public_marketable ET une activation est proposée — éligible pour REQUIRES_HUMAN_REVIEW. Pas de PUBLIC_SAFE automatique.",
      eligible: true,
      activationProposed: true,
      missingCapabilities: [],
    };
  }
  // Pas d'activation proposée : fail-closed par défaut, gate reste vert (rien à contrôler).
  return {
    status: "green",
    detail: eligible
      ? "Capacités requises complètes — aucune activation self-serve n'est proposée dans les bundles courants."
      : `Aucune activation self-serve n'est proposée. Capacités absentes/insuffisantes : ${missing.join(", ")}.`,
    eligible,
    activationProposed: false,
    missingCapabilities: missing,
  };
}

// Gate maturité — CORRIGÉ en CTC-6 (P0 CTO).
//
// Utilise explicitement effectiveMaturityWithAuthority : la maturité effective d'une
// déclaration résulte de storyKind + disclosureAuthority + plafond manifeste + proposition.
// Sans autorité de divulgation, la copy proposée est QUARANTINÉE (jamais évaluée comme
// publiable) — mais reste stockée pour promotion request. Le gate rapporte alors PROPOSAL
// STORED / NOT PUBLISHABLE, pas "conformes".
export function maturityGate(manifest: ProductManifest): {
  status: "green" | "red";
  detail: string;
} {
  const failures: string[] = [];
  const evaluated: string[] = [];
  const quarantined: string[] = [];
  for (const decl of MATURITY_DECLARATIONS) {
    const ceiling = manifestCeiling(manifest, decl.capabilityId);
    const { effective, wasClamped } = effectiveMaturityWithAuthority({
      proposed: decl.proposedMaturity,
      ceiling,
      authority: decl.disclosureAuthority,
      storyKind: decl.storyKind,
    });
    // Quarantaine : maturité effective = PRIVATE/FORBIDDEN OU clampée. La publicWording ne
    // sera pas rendue publiquement ; on ne l'évalue pas contre son contrat de copy proposé.
    // Elle reste néanmoins stockée en promotion request.
    if (wasClamped || effective === "PRIVATE" || effective === "FORBIDDEN") {
      quarantined.push(decl.capabilityId);
      continue;
    }
    evaluated.push(decl.capabilityId);
    const contract = MATURITY_COPY_CONTRACT[effective];
    for (const forbidden of contract.mustNotImply) {
      if (decl.publicWording.toLowerCase().includes(forbidden.toLowerCase())) {
        failures.push(
          `${decl.capabilityId}: publicWording contient "${forbidden}" interdit pour ${effective}.`,
        );
      }
    }
    if (!contract.ctaAllowed.includes(decl.cta)) {
      failures.push(
        `${decl.capabilityId}: CTA="${decl.cta}" non autorisé pour ${effective} (${contract.ctaAllowed.join("|")}).`,
      );
    }
  }
  if (failures.length > 0) {
    return { status: "red", detail: failures.join(" • ") };
  }
  return {
    status: "green",
    detail: `Évaluées: ${evaluated.length} (${evaluated.join(", ") || "∅"}). Quarantaine (proposition stockée, non publiable): ${quarantined.length} (${quarantined.join(", ") || "∅"}).`,
  };
}
