// Construction du manifeste d'attribution — logique TESTABLE, séparée du script d'écriture.
//
// Le script `scripts/build-attribution-manifest.ts` ne fait qu'appeler `buildManifest` et écrire le
// fichier. Toute la sélection (quelles collections, quels documents) et la projection (quels
// champs) vivent ici, sous test — sinon la seule preuve du périmètre du manifeste serait de lire
// l'artefact produit, ce qui ne dit rien du cas qu'on n'a pas rencontré (un brouillon, par exemple).

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

import { loadCollection, type ResolvedDocument } from "./content-loader";

export interface ManifestEntry {
  id: string;
  path: string;
  contentType: string;
  clusterId: string;
  configuredCtaVariant: string;
  resolvedCtaVariant: string | null;
  ctaVersion: number | null;
  sourceCommit: string;
}

/**
 * Une collection n'entre au manifeste que si sa route dynamique existe RÉELLEMENT. Le manifeste
 * décrit ce qui est publié, pas ce qui est rédigé : une entrée sans route désignerait une page
 * inexistante. (Lecture du seul filesystem de CE repo — aucun accès à un autre dépôt.)
 */
export function routedCollections(root: string): string[] {
  const contentRoot = path.join(root, "content");
  if (!existsSync(contentRoot)) return [];
  return readdirSync(contentRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((collection) => existsSync(path.join(root, "app", collection, "[slug]", "page.tsx")))
    .sort();
}

/**
 * Projection PURE documents → entrées. Filtre les brouillons : un contenu non publié ne produit
 * aucun HTML (`listPublishedSlugs` côté route), il ne doit donc pas être référencé ici.
 *
 * `configuredCtaVariant` / `resolvedCtaVariant` viennent de `doc.ctaResolution`, décidé par
 * `runGates` via `resolveCtaForDocument` — le manifeste ne recalcule JAMAIS le statut d'un CTA.
 */
export function toManifestEntries(docs: readonly ResolvedDocument[]): ManifestEntry[] {
  return docs
    .filter((doc) => doc.frontmatter.editorialStatus === "published")
    .map((doc) => ({
      id: doc.contentId,
      path: doc.path,
      contentType: doc.frontmatter.contentType,
      clusterId: doc.frontmatter.clusterId,
      configuredCtaVariant: doc.ctaResolution.configuredVariant,
      resolvedCtaVariant: doc.ctaResolution.resolvedVariant,
      ctaVersion: doc.ctaResolution.version,
      sourceCommit: doc.frontmatter.sourceCommit,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function buildManifest(root: string): { entries: ManifestEntry[] } {
  const docs = routedCollections(root).flatMap((collection) => loadCollection(collection));
  return { entries: toManifestEntries(docs) };
}
