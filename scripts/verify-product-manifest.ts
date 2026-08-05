// Vérificateur de dérive et de provenance — point d'entrée CI.
//
// Il confronte le registre éditorial de ce dépôt au manifeste produit épinglé, puis contrôle la
// provenance de chaque document. Toute la logique vit dans `lib/product-manifest/`, sous test ; ce
// fichier lit le disque, impose la politique de sortie et écrit un rapport lisible.
//
// POLITIQUE DE SORTIE :
//   - le site plus permissif que le produit → exit 1 ;
//   - une provenance non résolue            → exit 1 ;
//   - le site plus restrictif               → exit 0, mais imprimé. Le retard peut être voulu ;
//     le rendre bloquant reviendrait à publier sous pression de build.
//
// Aucune ligne de ce rapport ne recommande un statut. Il dit qui déclare quoi ; l'arbitrage est humain.

import { routedCollections } from "../lib/content/attribution-manifest";
import { loadCollection } from "../lib/content/content-loader";
import { blocking, compareAgainstLiveRegistry, reported, type Finding } from "../lib/product-manifest/drift";
import { loadPinnedManifest, PINNED_MANIFEST_PATH } from "../lib/product-manifest/manifest-schema";
import { blockingProblems, checkProvenance, isProven } from "../lib/product-manifest/provenance";

const ROOT = process.cwd();
const manifest = loadPinnedManifest(ROOT);

console.log(
  `Manifeste produit épinglé : ${PINNED_MANIFEST_PATH}\n` +
    `  dépôt      ${manifest.productRepository}\n` +
    `  snapshot   ${manifest.snapshotCommit} (${manifest.snapshotCommittedAt})\n` +
    `  périmètre  ${manifest.coverage.kind}\n` +
    `  entités    ${manifest.entities.length}\n`
);

if (manifest.coverage.kind === "partial") {
  // Imprimé en entier : un périmètre partiel dont la note reste invisible se lit comme un périmètre
  // complet. C'est la note qui distingue une absence décidée d'un oubli.
  console.log(`── Périmètre déclaré partiel\n  ${manifest.coverage.note}\n`);
}

const findings = compareAgainstLiveRegistry(manifest);
const provenance = routedCollections(ROOT)
  .flatMap((collection) => loadCollection(collection))
  .map((doc) =>
    checkProvenance(
      {
        contentId: doc.contentId,
        productSnapshotSha: doc.frontmatter.productSnapshotSha,
        evidenceRefs: doc.frontmatter.evidenceRefs,
        capabilityIds: doc.frontmatter.capabilityIds,
      },
      manifest
    )
  );

const line = (f: Finding) =>
  `  [${f.kind}] ${f.capabilityId}\n` +
  `      site    : ${f.siteDeclares ?? "—"}\n` +
  `      produit : ${f.productDeclares ?? "—"}\n` +
  `      ${f.message}`;

const blockers = blocking(findings);
const notes = reported(findings);
const unproven = provenance.filter((check) => !isProven(check));

if (notes.length > 0) {
  console.log(`── Rapporté (${notes.length}) — décision éditoriale attendue`);
  console.log(notes.map(line).join("\n\n"));
  console.log("");
}

if (provenance.length > 0) {
  console.log(`── Provenance du contenu (${provenance.length} document(s))`);
  for (const check of provenance) {
    console.log(
      `  ${isProven(check) ? "✓" : "✗"} ${check.contentId} — snapshot ${check.productSnapshotSha.slice(0, 7)}`
    );
    for (const problem of check.problems) {
      console.log(`      ${problem.severity === "blocking" ? "✗" : "ℹ️"} [${problem.kind}] ${problem.message}`);
    }
    if (check.prohibitedClaims.length > 0) {
      console.log(`      interdits : ${check.prohibitedClaims.join(" · ")}`);
    }
  }
  console.log("");
}

if (blockers.length > 0) {
  console.error(`── BLOQUANT — le site dépasse le produit (${blockers.length})`);
  console.error(blockers.map(line).join("\n\n"));
  console.error("");
}

if (unproven.length > 0) {
  console.error(`── BLOQUANT — provenance non résolue (${unproven.length})`);
  for (const check of unproven) {
    for (const problem of blockingProblems(check)) {
      console.error(`  ✗ ${check.contentId} [${problem.kind}] — ${problem.message}`);
    }
  }
  console.error("");
}

if (blockers.length > 0 || unproven.length > 0) process.exit(1);

console.log(
  `✅ Aucune affirmation du site ne dépasse le manifeste produit ; ${provenance.length} provenance(s) résolue(s).`
);
if (notes.length > 0) {
  console.log(
    `ℹ️  ${notes.length} écart(s) rapporté(s) attendent une décision, pas une correction automatique.`
  );
}
