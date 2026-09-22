import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";

import { HeroAnswerCard } from "@/components/product/HeroAnswerCard";
import { exampleAnswer } from "@/lib/fixtures/example-answer";
import { exampleMeasurement } from "@/lib/fixtures/example-measurement";
import { CAPABILITY_REGISTRY, isMarketableOn, type CapabilityId } from "@/lib/capability-registry";

const REPO_ROOT = path.resolve(__dirname, "..");
const markup = renderToStaticMarkup(<HeroAnswerCard />);

describe("carte de réponse du hero — état rendu par le serveur", () => {
  // Sans JavaScript, le lecteur garde l'état initial. Ce doit être l'ABSENCE : c'est le problème
  // que le reste de la page résout. Rendre la présence par défaut vendrait la conclusion avant
  // d'avoir posé la question.
  it("rend l'état d'absence, jamais celui de présence", () => {
    expect(markup).toContain("your brand — not cited");
    expect(markup).not.toContain("cited, with its source");
  });

  it("ne cite aucune source de la marque dans l'état d'absence", () => {
    expect(markup).not.toContain("yourbrand.example");
  });

  // L'étiquette d'illustration doit être LUE avant le contenu, par une personne comme par un
  // lecteur d'écran. On vérifie l'ordre dans le markup, pas seulement la présence.
  it("annonce « Illustrative » avant le corps de la réponse", () => {
    expect(markup.indexOf("Illustrative")).toBeGreaterThan(-1);
    expect(markup.indexOf("Illustrative")).toBeLessThan(markup.indexOf(exampleAnswer.absent.body));
  });

  it("expose une commande réelle pour arrêter la mise à jour automatique (WCAG 2.2.2)", () => {
    expect(markup).toContain("<button");
    expect(markup).toContain("Show after");
    expect(markup).toContain('aria-labelledby="hero-answer-title"');
  });
});

describe("fixture de réponse — invariants de vérité publique", () => {
  const allSources = [...exampleAnswer.absent.sources, ...exampleAnswer.cited.sources];

  // Nommer un concurrent réel serait un claim de marché : il exigerait une source gouvernée
  // (copy-safety-rules.spec.md §4), qu'une carte d'illustration ne peut pas porter.
  it("n'utilise que des hôtes sous le TLD réservé `.example`", () => {
    for (const source of allSources) {
      expect(source.host.endsWith(".example")).toBe(true);
    }
  });

  // Toute la démonstration tient dans « même réponse ». Si les sources non-marque divergeaient,
  // la carte montrerait deux réponses différentes et la promesse deviendrait fausse en silence.
  it("garde les sources non-marque identiques et dans le même ordre entre les deux états", () => {
    const nonBrand = (sources: readonly { host: string; brand: boolean }[]) =>
      sources.filter((source) => !source.brand).map((source) => source.host);

    expect(nonBrand(exampleAnswer.cited.sources)).toEqual(nonBrand(exampleAnswer.absent.sources));
  });

  it("cite la marque exactement une fois dans l'état de présence, jamais dans l'autre", () => {
    expect(exampleAnswer.cited.sources.filter((source) => source.brand)).toHaveLength(1);
    expect(exampleAnswer.absent.sources.filter((source) => source.brand)).toHaveLength(0);
  });

  // Le hero et le panneau « Authority Presence » sont sur la même page. Deux versions de panel
  // affichées côte à côte diraient que ce ne sont pas les mêmes mesures.
  it("lit la version du panel depuis la fixture de mesure, sans la redéclarer", () => {
    expect(exampleAnswer.panelVersion).toBe(exampleMeasurement.panelVersion);
    expect(markup).toContain(`panel ${exampleMeasurement.panelVersion}`);
  });
});

describe("carte de réponse — gates de surface", () => {
  // Le même verrou que la homepage : une capacité non commercialisable SUR CETTE SURFACE n'a rien
  // à faire dans une copy de hero, quel que soit son statut d'implémentation.
  it("ne nomme aucune capacité non commercialisable en homepage", () => {
    const ids = Object.keys(CAPABILITY_REGISTRY) as CapabilityId[];

    for (const id of ids) {
      const declaration = CAPABILITY_REGISTRY[id];
      if (isMarketableOn(declaration, "homepage")) continue;

      expect(markup).not.toContain(id);
      if (declaration.label) expect(markup).not.toContain(declaration.label);
    }
  });

  // Le bloc CSS de la carte ne référence QUE des alias sémantiques. Une primitive écrite en dur
  // rouvrirait la divergence que le contrat visuel tient fermée — et permettrait d'introduire un
  // ambre d'absence sans passer par une ratification.
  it("n'introduit aucune couleur brute dans son bloc de styles", () => {
    const css = readFileSync(path.join(REPO_ROOT, "app/globals.css"), "utf8");
    const marker = "CARTE DE RÉPONSE DU HERO";
    const block = css.slice(css.indexOf(marker));

    expect(block.length).toBeGreaterThan(0);
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(block).not.toMatch(/\brgba?\(/);
  });
});
