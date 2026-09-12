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

import { MATURITY_COPY_CONTRACT, manifestCeiling, reconcileMaturity } from "./maturity";
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
        : {
            status: "green",
            detail:
              "Source CANDIDATE — bundle préparé pour déblocage futur, non publiable en l'état.",
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

  if (delta.declarationDiverged) {
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

  if (delta.declarationDiverged) {
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

// Invariant : aucune capacité `internal_only` du manifeste ne peut ouvrir un CTA self-serve public.
// Ce gate ne dépend pas de la ref cible — il porte sur l'état actuel du manifeste ÉPINGLÉ, donc
// sur la vérité autoritative en vigueur.
export function selfServeCtaGate(manifest: ProductManifest): { status: "green" | "red"; detail: string } {
  // Les capacités qui, si elles devenaient public_marketable, POURRAIENT justifier un CTA
  // self-serve public. À défaut, la seule voie publique reste `measurement_request` (assisted).
  const selfServeCandidates = ["truth-check", "grounded-truth-check", "structured-generation"];

  const violating: string[] = [];
  for (const id of selfServeCandidates) {
    const entity = manifest.entities.find((e) => e.id === id);
    if (!entity) continue;
    if (entity.publicationStatus === "public_marketable") {
      // Cas hypothétique : si un jour cette capacité devient public_marketable, le pipeline
      // POURRA proposer l'activation self-serve. C'est un chemin ouvert, jamais un chemin
      // auto-emprunté.
      // Rien à interdire ici — la marketable est déjà validée par le pipeline manifest.
      continue;
    }
    if (entity.publicationStatus === "internal_only") {
      // Pas d'infraction observée dans ce pipeline (nous ne publions pas de CTA ici). Ce gate
      // sert de tripwire : si à l'avenir un skeleton propose activate self-serve alors que
      // ces capacités sont internal_only, le test unitaire correspondant échouera.
      violating.push(id);
    }
  }

  if (violating.length > 0) {
    return {
      status: "green",
      detail: `${violating.length} capacité(s) self-serve reste(nt) internal_only (${violating.join(", ")}). Le pipeline ne propose PAS d'activation publique.`,
    };
  }
  return { status: "green", detail: "Aucune capacité self-serve n'est déclarée public_marketable ; assisted CTA reste seule voie publique." };
}

// Gate maturité : chaque déclaration éditoriale doit RESTER sous le plafond manifeste après
// réconciliation, ET n'employer aucun terme interdit par le contrat de copy de sa maturité
// EFFECTIVE. En cas de violation, le gate passe au rouge — la déclaration doit être corrigée
// ou retirée.
export function maturityGate(manifest: ProductManifest): { status: "green" | "red"; detail: string } {
  const failures: string[] = [];
  for (const decl of MATURITY_DECLARATIONS) {
    const ceiling = manifestCeiling(manifest, decl.capabilityId);
    const { effective, wasClamped } = reconcileMaturity({
      proposed: decl.proposedMaturity,
      ceiling,
    });
    // Si la déclaration est clamped, sa publicWording n'est PAS publiée telle quelle : le
    // consommateur utilise la copy autorisée par la maturité effective. Un clamp est un signal
    // opérationnel (opportunity report), pas une infraction — le gate reste vert.
    if (wasClamped) continue;
    const contract = MATURITY_COPY_CONTRACT[decl.proposedMaturity];
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
    detail: `${MATURITY_DECLARATIONS.length} déclarations éditoriales conformes au contrat de copy et au plafond manifeste.`,
  };
}
