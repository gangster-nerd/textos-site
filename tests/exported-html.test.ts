// Tests de l'EXPORT statique : ce qui est réellement dans out/ après `next build`.
//
// Ces tests portent sur l'artefact, pas sur la logique — ils ne peuvent donc s'exécuter qu'APRÈS
// un build. Le fichier SVG source, lui, est vérifiable en permanence.
//
// `skipIf` plutôt qu'un échec sur un repo fraîchement cloné : la séquence de vérification lance
// vitest AVANT le build. Un `skipped` n'est pas une preuve — le rapport de sprint doit montrer la
// passe POST-BUILD, où ces tests s'exécutent vraiment.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, test } from "vitest";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "out");
const FAQ_SLUG = "does-textos-automatically-verify-claims";
const FAQ_HTML = path.join(OUT, "faq", `${FAQ_SLUG}.html`);
const SVG = path.join(ROOT, "public", "diagrams", "epistemic-layers-v1.svg");

describe("fichier SVG source (toujours vérifiable)", () => {
  test("contient <title> et <desc> non vides", () => {
    const svg = readFileSync(SVG, "utf8");
    const title = /<title[^>]*>([^<]+)<\/title>/.exec(svg);
    const desc = /<desc[^>]*>([^<]+)<\/desc>/.exec(svg);
    expect(title?.[1].trim()).toBeTruthy();
    expect(desc?.[1].trim()).toBeTruthy();
  });

  test("nomme les quatre couches et le périmètre courant", () => {
    const svg = readFileSync(SVG, "utf8");
    for (const layer of ["Observation", "Extraction", "Verification", "Judgement"]) {
      expect(svg).toContain(layer);
    }
    expect(svg).toMatch(/Claim Evidence Layer/);
    // Délimitation visuelle explicite du périmètre : bordure en pointillés.
    expect(svg).toMatch(/stroke-dasharray/);
  });
});

describe.skipIf(!existsSync(FAQ_HTML))("export statique out/ (post-build)", () => {
  const html = () => readFileSync(FAQ_HTML, "utf8");

  test("aucun CTA rendu en S1 (toutes les variantes sont disabled)", () => {
    expect(html()).not.toContain("content-cta");
    expect(html()).not.toContain("data-cta-variant");
    // Ni bouton grisé, ni promesse différée : le CTA est absent, pas désactivé.
    expect(html()).not.toMatch(/coming soon/i);
  });

  test("le visuel est rendu avec un alt et une figcaption", () => {
    const out = html();
    expect(out).toContain('data-visual-id="epistemic-layers-v1"');
    expect(out).toContain("/diagrams/epistemic-layers-v1.svg");
    expect(out).toMatch(/<img[^>]+alt="[^"]{20,}"/);
    expect(out).toMatch(/<figcaption>[^<]+<\/figcaption>/);
  });

  test("le manifeste d'attribution existe et pointe la route réelle", () => {
    const manifest = JSON.parse(
      readFileSync(path.join(OUT, "content-attribution-manifest.json"), "utf8")
    );
    const faq = manifest.entries.find(
      (e: { id: string }) => e.id === `faq:${FAQ_SLUG}`
    );
    expect(faq.resolvedCtaVariant).toBeNull();
    expect(existsSync(path.join(OUT, "faq", `${FAQ_SLUG}.html`))).toBe(true);
  });
});
