// Répartition des composants CSE entre le PRODUIT (textos-v0, propriétaire du cœur portable et du
// contrat ContentDocument) et le SITE (renderer, intégration, politique de surface, conversion).
//
// Ce test rend la frontière mécanique : un fichier propriété du produit modifié ici, un fork site
// modifié sans re-scellement, ou un nouveau fichier jamais classé font échouer la CI. La comparaison
// avec le produit lui-même est l'affaire de `pnpm cse:ownership --product <chemin>` (hors CI : le
// site ne dépend jamais d'un checkout produit pour se construire).

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { CSE_OWNERSHIP, CSE_ROOT, classifyCseFile } from "../scripts/cse-ownership";

const sha256 = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe("CSE — fichiers propriété du produit (vendus à l'identique)", () => {
  test.each(CSE_OWNERSHIP.productOwned.map((e) => [e.path, e.sha256]))("%s n'a pas été modifié ici", (rel, pinned) => {
    expect(sha256(path.join(CSE_ROOT, rel)), `${rel} appartient à textos-v0 : modifier le produit puis re-vendre`).toBe(pinned);
  });

  test.each(CSE_OWNERSHIP.productOwnedContracts.map((e) => [e.path, e.sha256]))("contrat %s inchangé", (rel, pinned) => {
    expect(sha256(path.resolve(rel))).toBe(pinned);
  });
});

describe("CSE — forks d'identité du site (re-scellement délibéré)", () => {
  test.each(CSE_OWNERSHIP.siteAdapted.map((e) => [e.path, e.sha256]))("%s correspond à son scellé", (rel, pinned) => {
    expect(sha256(path.join(CSE_ROOT, rel)), `${rel} : re-sceller via pnpm cse:ownership --refresh`).toBe(pinned);
  });
});

describe("CSE — chaque fichier a exactement un propriétaire", () => {
  test("aucun chemin classé deux fois", () => {
    const listed = [...CSE_OWNERSHIP.productOwned, ...CSE_OWNERSHIP.siteAdapted].map((e) => e.path);
    expect(new Set(listed).size).toBe(listed.length);
  });

  test("tout fichier du moteur est classé (produit, fork site, ou site)", () => {
    const files = walk(CSE_ROOT).map((f) => path.relative(CSE_ROOT, f).split(path.sep).join("/"));
    expect(files.length).toBeGreaterThan(CSE_OWNERSHIP.productOwned.length);
    const counts = { product_owned: 0, site_adapted: 0, site_owned: 0, manifest: 0 };
    for (const f of files) counts[classifyCseFile(f)] += 1;
    expect(counts.product_owned).toBe(CSE_OWNERSHIP.productOwned.length);
    expect(counts.site_adapted).toBe(CSE_OWNERSHIP.siteAdapted.length);
    expect(counts.manifest).toBe(1);
  });

  test("le cœur produit ne dépend jamais du site (aucun import de renderer, d'intégration, de conversion ni de React)", () => {
    for (const { path: rel } of CSE_OWNERSHIP.productOwned) {
      const code = readFileSync(path.join(CSE_ROOT, rel), "utf8");
      const imports = [...code.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);
      for (const spec of imports) {
        expect(spec, `${rel} importe ${spec}`).not.toMatch(/renderer|site-integration|surface-policy\/textos-site|^react|lib\/conversion|components\//);
      }
    }
  });
});
