// Squelettes DÉTERMINISTES pour chaque surface impactée.
//
// Un squelette n'est PAS une rédaction. Il porte :
//   - la provenance (source ref, truthLevel, digest),
//   - la surface visée,
//   - le statut de publishability,
//   - un rappel des bornes éditoriales (capacités actuellement commercialisables),
//   - des sections vides à remplir par l'opérateur (Claude Code local, jamais CI).
//
// La déterminisme est essentielle : deux runs consécutifs de `content:sync` sur la même ref
// doivent produire des squelettes byte-identiques (hors timestamps de provenance). Test unitaire :
// `deterministic repeated sync`.

import type {
  ContentBundle,
  ImpactSurface,
  SurfaceImpact,
} from "./types";

export function renderSkeleton(args: {
  bundle: ContentBundle;
  surface: SurfaceImpact;
}): string {
  const { bundle, surface } = args;
  const head = [
    "---",
    `surface: ${surface.surface}`,
    `truthLevel: ${bundle.truthLevel}`,
    `sourceProductRef: ${bundle.provenance.sourceRef.sha}`,
    `declarationDigest: ${bundle.provenance.sourceRef.declarationDigest}`,
    `pinnedManifestSha: ${bundle.provenance.pinnedManifestSha}`,
    `publishabilityStatus: ${surface.status}`,
    `bundleId: ${bundle.bundleId}`,
    "---",
    "",
  ].join("\n");

  const body = SKELETON_BODIES[surface.surface] ?? DEFAULT_SKELETON;
  const footer = [
    "",
    "## Provenance",
    "",
    `- Source ref: \`${bundle.provenance.sourceRef.sha}\` (${bundle.truthLevel})`,
    `- Statut: **${surface.status}**`,
    `- Raison: ${surface.statusReason}`,
    "",
    "## Bornes éditoriales actuelles",
    "",
    "- Ne revendiquer que les capacités `public_marketable` du manifeste épinglé.",
    "- Ne pas introduire de terme prohibé (voir `copy-safety-rules.spec.md`).",
    "- Aucun résultat client réel ni valeur simulée présentée comme réelle.",
    "- Les figures documentaires doivent rester visuellement identifiables comme telles.",
    "",
    "## Rédaction",
    "",
    "> Squelette à compléter par l'opérateur local (agent Claude Code). Ne pas éditer en CI.",
    "",
  ].join("\n");

  return head + body + footer;
}

const DEFAULT_SKELETON = [
  "# Candidat éditorial",
  "",
  "Section à compléter.",
  "",
].join("\n");

const SKELETON_BODIES: Partial<Record<ImpactSurface, string>> = {
  homepage: [
    "# Homepage — refresh narrative",
    "",
    "Arc narratif attendu (product-led, non catalogue de fonctionnalités) :",
    "",
    "1. Problème : la présence d'autorité dans les réponses de modèles n'est pas mesurée.",
    "2. Mesure : ce que TextOS observe (panel versionné, Direct + Indirect + Total).",
    "3. Preuve : produit documentaire — pas de valeurs simulées présentées comme réelles.",
    "4. Insight : ce que la mesure révèle (limites incluses).",
    "5. Action : ce que TextOS peut authentiquement soutenir aujourd'hui (`measurement_request` assisté).",
    "6. Conversion : CTA `measurement_request` — pas d'activation self-serve.",
    "",
  ].join("\n"),
  product_proof: [
    "# Product Proof — refresh grammaire",
    "",
    "Grammaire attendue : de quoi une mesure est faite, dans le vocabulaire réel.",
    "",
    "- Direct Share of Model, Indirect Mention Share, Total Authority Presence.",
    "- Quality Ledger (traçabilité de la mesure).",
    "- Valeurs affichées EXPLICITEMENT documentaires (marquage visuel).",
    "- Pas de faux run id, pas de faux id client, pas de fausse source.",
    "",
  ].join("\n"),
  faq: [
    "# FAQ — mise à jour",
    "",
    "Points candidats à revoir dans les bornes autoritatives :",
    "",
    "- Formulation de la mesure (Direct/Indirect/Total).",
    "- Distinction observation vs prédiction.",
    "- Ce que TextOS ne fait pas encore publiquement (opportunity brief, truth check → internal_only).",
    "",
  ].join("\n"),
  methodology: [
    "# Methodology — mise à jour",
    "",
    "Nœuds à réviser :",
    "",
    "- Composition de la mesure et ses limites.",
    "- Quality Ledger.",
    "- Explicitation que S8 (claim-evidence) reste `candidate` et non `public_marketable`.",
    "",
  ].join("\n"),
};
