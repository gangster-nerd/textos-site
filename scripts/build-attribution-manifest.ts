// Manifeste d'attribution du contenu → out/content-attribution-manifest.json
//
// Branché en "postbuild", jamais en commande manuelle : `next build` régénère `out/`, donc
// l'artefact doit être écrit APRÈS le build — sinon un build ultérieur l'effacerait sans bruit.
//
// TypeScript exécuté par tsx (et non un .mjs) POUR UNE RAISON DE FOND : un script JavaScript ne
// peut pas importer proprement le loader, les gates et les registres TypeScript. Il faudrait en
// recopier la logique — donc créer une seconde source de vérité sur la conversion, qui divergerait
// au premier changement. Ce script ne recalcule RIEN : il appelle le même loader que les pages,
// qui appelle le même `resolveCta`. Si un CTA apparaît dans le HTML, il apparaît ici, et l'inverse.
//
// Ce fichier est un POINT D'ENTRÉE : la sélection et la projection vivent dans
// `lib/content/attribution-manifest.ts`, sous test.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { buildManifest } from "../lib/content/attribution-manifest";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "out");
const MANIFEST = path.join(OUT_DIR, "content-attribution-manifest.json");

const manifest = buildManifest(ROOT);

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(
  `✅ content-attribution-manifest.json — ${manifest.entries.length} entrée(s) publiée(s)`
);
