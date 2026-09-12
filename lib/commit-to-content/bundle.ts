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

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { ContentBundle } from "./types";
import { renderSkeleton } from "./skeletons";

export function bundleDir(siteRoot: string, bundle: ContentBundle): string {
  const truth = bundle.truthLevel === "AUTHORITATIVE_MAIN" ? "authoritative" : "candidate";
  return path.join(siteRoot, "content-bundles", `${truth}-${bundle.provenance.sourceRef.shortSha}`);
}

export function writeBundle(siteRoot: string, bundle: ContentBundle): string {
  const dir = bundleDir(siteRoot, bundle);
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  mkdirSync(path.join(dir, "candidates"), { recursive: true });

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
  writeFileSync(path.join(dir, "STATUS.md"), renderStatusMd(bundle), "utf8");

  for (const surface of bundle.surfaces) {
    if (!surface.candidateSkeletonPath) continue;
    const file = path.join(dir, surface.candidateSkeletonPath);
    writeFileSync(file, renderSkeleton({ bundle, surface }), "utf8");
  }

  return dir;
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
