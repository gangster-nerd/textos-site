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

  test("le CTA de mesure est rendu une seule fois, avec son attribution", () => {
    const out = html();
    // Une seule occurrence DANS LE DOM. La seconde chaîne du fichier appartient au payload RSC
    // sérialisé par Next — même bloc, pas un second rendu.
    expect(out.match(/class="content-cta"/g) ?? []).toHaveLength(1);
    expect(out).toContain('data-cta-variant="measurement_request"');
    expect(out).toContain('data-cta-version="1"');
    expect(out).toContain('data-content-id="faq:does-textos-automatically-verify-claims"');
    expect(out).toContain('data-cta-position="end"');
  });

  test("le CTA vient APRÈS le corps, jamais juste après le short answer", () => {
    const out = html();
    const shortAnswer = out.indexOf("Short answer");
    const visual = out.indexOf("data-visual-id");
    const cta = out.indexOf('class="content-cta"');
    expect(shortAnswer).toBeGreaterThan(-1);
    expect(visual).toBeGreaterThan(shortAnswer);
    expect(cta).toBeGreaterThan(visual);
  });

  test("le bloc CTA ne contient aucune promesse excessive", () => {
    // Portée volontairement RESTREINTE au bloc de conversion : « automatically » est le sujet même
    // de cette FAQ (« Does TextOS automatically verify claims? »). Interdire le mot sur toute la
    // page confondrait le propos éditorial avec une promesse commerciale.
    const out = html();
    const start = out.indexOf('class="content-cta"');
    expect(start).toBeGreaterThan(-1);
    // TEXTE VISIBLE seulement : les attributs portent `data-content-id`, dérivé du slug — lequel
    // contient « automatically ». Un identifiant technique n'est pas une promesse.
    const cta = out
      .slice(start, out.indexOf("</aside>", start))
      .replace(/<[^>]*>/g, " ")
      .replace(/^[^>]*>/, "")
      .toLowerCase();
    for (const forbidden of ["coming soon", "guaranteed", "automatically", "free trial", "instant"]) {
      expect(cta, `ne doit pas apparaître dans le CTA : ${forbidden}`).not.toContain(forbidden);
    }
  });

  test("aucun identifiant interne n'est exposé dans l'export", () => {
    const out = html().toLowerCase();
    for (const internal of ["sales_copy", "sales-authority", "observe-authority-presence", "capabilityid"]) {
      expect(out, `identifiant interne exposé : ${internal}`).not.toContain(internal);
    }
  });

  test("le visuel est rendu avec un alt et une figcaption", () => {
    const out = html();
    expect(out).toContain('data-visual-id="epistemic-layers-v1"');
    expect(out).toContain("/diagrams/epistemic-layers-v1.svg");
    expect(out).toMatch(/<img[^>]+alt="[^"]{20,}"/);
    expect(out).toMatch(/<figcaption>[^<]+<\/figcaption>/);
  });

  test("le manifeste reflète le CTA réellement rendu", () => {
    const manifest = JSON.parse(
      readFileSync(path.join(OUT, "content-attribution-manifest.json"), "utf8")
    );
    const faq = manifest.entries.find((e: { id: string }) => e.id === `faq:${FAQ_SLUG}`);
    expect(faq.configuredCtaVariant).toBe("measurement_request");
    expect(faq.resolvedCtaVariant).toBe("measurement_request");
    expect(faq.ctaVersion).toBe(1);
    expect(existsSync(path.join(OUT, "faq", `${FAQ_SLUG}.html`))).toBe(true);
  });

  test("le parcours de conversion est complet dans l'export", () => {
    const form = readFileSync(path.join(OUT, "request-measurement.html"), "utf8");
    const received = readFileSync(
      path.join(OUT, "request-measurement", "received.html"),
      "utf8"
    );
    // Formulaire complet, en mode démo, sans action externe.
    expect(form).toContain('data-conversion-mode="demo"');
    expect(form).toContain("What questions do your buyers ask?");
    expect(form).toContain("Do not include confidential");
    expect(form).not.toMatch(/action="https?:/);
    // Disclosure de démonstration, et confirmation gouvernée inchangée.
    expect(form).toContain("Demo environment");
    expect(received).toContain("Request received.");
    expect(received).toContain("not an acceptance, a commitment to respond, or delivery");
  });
});
