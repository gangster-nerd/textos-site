// Persistance des bundles content-to-content sur disque.
//
// Chaque bundle vit sous `content-bundles/<truthLevel-lowercase>-<sha7>/`. Le timestamp n'est PAS
// dans le nom du répertoire : deux runs consécutifs à la même ref doivent viser le même chemin
// pour rester déterministes (le run précédent est écrasé volontairement — un bundle est une vue
// courante de la vérité produit à cette ref, pas une archive).
//
// Contenu du répertoire :
//   - bundle.json          : sérialisation machine complète
//   - STATUS.md            : rendu humain
//   - provenance.json      : source ref, truthLevel, digest, pinned, siteHead
//   - publishability.json  : décision par surface + gates
//   - candidates/<surface>.md : squelettes déterministes

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { ContentBundle } from "./types";
import { renderSkeleton } from "./skeletons";

export function bundleDir(siteRoot: string, bundle: ContentBundle): string {
  const truth =
    bundle.truthLevel === "AUTHORITATIVE_MAIN"
      ? "authoritative"
      : bundle.truthLevel === "CANDIDATE"
        ? "candidate"
        : "unrecognized";
  return path.join(siteRoot, "content-bundles", `${truth}-${bundle.provenance.sourceRef.shortSha}`);
}

export function writeBundle(siteRoot: string, bundle: ContentBundle): string {
  const dir = bundleDir(siteRoot, bundle);

  // Préservation du contenu éditorial authored par l'opérateur : les fichiers sous
  // `editorial/` sont capturés AVANT effacement puis restaurés après régénération. C'est ce
  // qui rend une réémission de bundle sûre sans détruire les candidats de copy déjà rédigés.
  const preservedEditorial = snapshotEditorial(dir);

  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  mkdirSync(path.join(dir, "candidates"), { recursive: true });
  mkdirSync(path.join(dir, "editorial"), { recursive: true });
  mkdirSync(path.join(dir, "promotions"), { recursive: true });

  writeFileSync(path.join(dir, "bundle.json"), stableStringify(bundle) + "\n", "utf8");
  writeFileSync(path.join(dir, "provenance.json"), stableStringify(bundle.provenance) + "\n", "utf8");
  writeFileSync(
    path.join(dir, "publishability.json"),
    stableStringify({
      overallStatus: bundle.overallStatus,
      overallReason: bundle.overallReason,
      gates: bundle.gates,
      surfaces: bundle.surfaces,
    }) + "\n",
    "utf8",
  );
  writeFileSync(
    path.join(dir, "promotion-requests.json"),
    stableStringify(bundle.promotionRequests) + "\n",
    "utf8",
  );
  writeFileSync(path.join(dir, "STATUS.md"), renderStatusMd(bundle), "utf8");

  for (const surface of bundle.surfaces) {
    if (!surface.candidateSkeletonPath) continue;
    const file = path.join(dir, surface.candidateSkeletonPath);
    writeFileSync(file, renderSkeleton({ bundle, surface }), "utf8");
  }

  // Rendu humain d'une promotion par entrée clampée.
  for (const p of bundle.promotionRequests) {
    if (!p.promotionRequired) continue;
    const file = path.join(dir, "promotions", `${p.capabilityId}.md`);
    writeFileSync(file, renderPromotionRequestMd(p), "utf8");
  }

  // Restauration des éditoriaux opérateur.
  for (const [rel, contents] of preservedEditorial) {
    const target = path.join(dir, rel);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, contents, "utf8");
  }

  return dir;
}

function snapshotEditorial(dir: string): Array<[string, string]> {
  const editorial = path.join(dir, "editorial");
  if (!existsSync(editorial)) return [];
  const out: Array<[string, string]> = [];
  const walk = (abs: string, rel: string) => {
    for (const name of readdirSync(abs)) {
      const nextAbs = path.join(abs, name);
      const nextRel = path.join(rel, name);
      if (statSync(nextAbs).isDirectory()) walk(nextAbs, nextRel);
      else out.push([nextRel, readFileSync(nextAbs, "utf8")]);
    }
  };
  walk(editorial, "editorial");
  return out;
}

function renderPromotionRequestMd(p: import("./promotion-requests").PromotionRequest): string {
  const lines: string[] = [];
  lines.push(`# Promotion request — \`${p.capabilityId}\``);
  lines.push("");
  lines.push(`- **storyKind**: ${p.storyKind}`);
  lines.push(`- **route**: **${p.route}**`);
  lines.push(`- **requiredOwner**: ${p.requiredOwner}`);
  lines.push(`- **requestedPublicMaturity**: ${p.requestedPublicMaturity}`);
  lines.push(`- **effectivePublicMaturity**: **${p.effectivePublicMaturity}**`);
  lines.push(`- **manifestCeiling**: ${p.manifestCeiling}`);
  lines.push(`- **disclosureAuthority**: ${p.disclosureAuthority}`);
  lines.push(`- **clamped**: ${p.clamped}`);
  lines.push(`- **customerDeliverableNow**: ${p.customerDeliverableNow}`);
  lines.push(`- **manualEngineeringRequired**: ${p.manualEngineeringRequired}`);
  lines.push(`- **sourceProductRef**: \`${p.sourceProductRef}\``);
  lines.push("");
  lines.push("## Blocking reason");
  lines.push("");
  lines.push(p.blockingReason);
  lines.push("");
  lines.push("## Required next action");
  lines.push("");
  lines.push(p.requiredNextAction);
  lines.push("");
  if (p.requestedManifestChange) {
    lines.push("## Requested manifest change");
    lines.push("");
    lines.push("```");
    lines.push(p.requestedManifestChange);
    lines.push("```");
    lines.push("");
  }
  lines.push("## Implementation evidence");
  for (const e of p.implementationEvidence) lines.push(`- \`${e}\``);
  lines.push("");
  lines.push("## Allowed wording");
  for (const w of p.allowedWording) lines.push(`- ${w}`);
  lines.push("");
  lines.push("## Prohibited wording");
  for (const w of p.prohibitedWording) lines.push(`- ${w}`);
  lines.push("");
  lines.push(`## Allowed CTAs\n\n- ${p.allowedCtas.join(", ") || "—"}\n`);
  return lines.join("\n");
}

function renderStatusMd(bundle: ContentBundle): string {
  const lines: string[] = [];
  lines.push(`# ${bundle.bundleId}`);
  lines.push("");
  lines.push(`- **truthLevel**: ${bundle.truthLevel}`);
  lines.push(`- **sourceProductRef**: \`${bundle.provenance.sourceRef.sha}\``);
  lines.push(`- **pinnedManifestSha**: \`${bundle.provenance.pinnedManifestSha}\``);
  lines.push(`- **matchesPinnedManifest**: ${bundle.provenance.sourceRef.matchesPinnedManifest}`);
  lines.push(`- **overallStatus**: **${bundle.overallStatus}**`);
  lines.push(`- **overallReason**: ${bundle.overallReason}`);
  lines.push("");
  lines.push("## Gates");
  for (const [name, gate] of Object.entries(bundle.gates)) {
    lines.push(`- \`${name}\`: **${gate.status}** — ${gate.detail}`);
  }
  lines.push("");
  lines.push("## Surfaces");
  for (const s of bundle.surfaces) {
    lines.push(`- \`${s.surface}\` → **${s.status}** — ${s.statusReason}`);
  }
  lines.push("");
  lines.push("## Capability delta");
  lines.push(
    "- added: " +
      (bundle.capabilityDelta.addedEntityIds.length === 0
        ? "∅"
        : bundle.capabilityDelta.addedEntityIds.join(", ")),
  );
  lines.push(
    "- removed: " +
      (bundle.capabilityDelta.removedEntityIds.length === 0
        ? "∅"
        : bundle.capabilityDelta.removedEntityIds.join(", ")),
  );
  lines.push(
    "- changed: " +
      (bundle.capabilityDelta.changedEntityIds.length === 0
        ? "∅"
        : bundle.capabilityDelta.changedEntityIds.join(", ")),
  );
  lines.push(`- declarationDiverged: ${bundle.capabilityDelta.declarationDiverged}`);
  lines.push("");
  lines.push("## Promotion requests");
  const required = bundle.promotionRequests.filter((p) => p.promotionRequired);
  if (required.length === 0) {
    lines.push("- Aucune promotion requise.");
  } else {
    for (const p of required) {
      lines.push(
        `- \`${p.capabilityId}\` → **${p.route}** (owner: ${p.requiredOwner}) — ${p.blockingReason}`,
      );
    }
  }
  lines.push("");
  lines.push("## Opportunities");
  for (const o of bundle.opportunities) {
    const cap = o.capabilityId ?? "—";
    const mat = o.effectiveMaturity ?? "—";
    const clamp = o.wasClamped ? " (clamped)" : "";
    lines.push(`- **${o.kind}** \`${cap}\` → ${mat}${clamp} — ${o.reason}`);
  }
  lines.push("");
  return lines.join("\n") + "\n";
}

// Sérialisation stable : clés triées, indent 2, pas de champ dépendant de l'heure de sérialisation.
function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value), null, 2);
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    const out: Record<string, unknown> = {};
    for (const [k, v] of entries) out[k] = sortKeys(v);
    return out;
  }
  return value;
}
