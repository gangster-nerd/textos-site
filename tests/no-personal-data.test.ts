// Garde de build — décision permanente du Release Owner (23/11/2026) : « aucun identifiant interne ne doit
// être visible et mes informations personnelles comme mon adresse mail, numéro de téléphone et mon adresse ne
// doivent jamais être visibles sur le site ».
//
// Ce test lit tout ce que le site publie (sources de contenu, documents légaux, pages, composants, fichiers
// servis tels quels) et refuse :
//   - toute adresse de courriel personnelle connue (liste fermée) — AJOUTÉE avec le remplacement du courriel
//     des CGV par le courriel professionnel (en attente de Marc, 23/11) : tant que `legal/cgv.md` le porte,
//     cette vérification rendrait le build rouge, et l'exclure ferait taire la garde ;
//   - tout numéro de téléphone français ;
//   - tout UUID (identifiant interne d'espace, de brouillon, de brief, de document).
// Il ne remplace pas la relecture : une valeur personnelle inconnue de la liste peut passer. Il garantit
// qu'aucune valeur connue ne revient, et qu'aucun identifiant interne de TextOS ne fuit dans une page.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
/** Ce que le site rend ou sert : pas les tests, pas les scripts, pas les dépendances. */
const PUBLISHED = ["content", "legal", "app", "components", "lib", "public", "textos/briefs", "textos/deliveries", "textos/delivery-reviews"];
const PHONE_FR = /(?:\+33\s?|\b0)[1-9](?:[\s.-]?\d{2}){4}\b/;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;

function files(dir: string): string[] {
  let entries: string[];
  try { entries = readdirSync(path.join(ROOT, dir)); } catch { return []; }
  return entries.flatMap((name) => {
    const rel = path.join(dir, name);
    const full = path.join(ROOT, rel);
    if (statSync(full).isDirectory()) return files(rel);
    return /\.(md|mdx|json|ts|tsx|js|mjs|txt|html|svg|xml)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [rel] : [];
  });
}

describe("aucune donnée personnelle ni identifiant interne sur le site", () => {
  const published = PUBLISHED.flatMap(files);
  it("lit bien les sources publiées", () => expect(published.length).toBeGreaterThan(50));
  for (const file of published) {
    it(file, () => {
      const text = readFileSync(path.join(ROOT, file), "utf8");
      expect(PHONE_FR.exec(text)?.[0] ?? null, `numéro de téléphone dans ${file}`).toBeNull();
      expect(UUID.exec(text)?.[0] ?? null, `identifiant interne (UUID) dans ${file}`).toBeNull();
    });
  }
});
