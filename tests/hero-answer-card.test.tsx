import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";

import { HeroAnswerCard } from "@/components/product/HeroAnswerCard";
import { TRACKED_BRAND, VALUE_STORY_ANSWER } from "@/lib/product-proof/value-story-example";
import { CAPABILITY_REGISTRY, isMarketableOn, type CapabilityId } from "@/lib/capability-registry";

const REPO_ROOT = path.resolve(__dirname, "..");
const markup = renderToStaticMarkup(<HeroAnswerCard />);

describe("carte de réponse du hero — ce qu'elle montre", () => {
  // La carte pose le PROBLÈME. Rendre la présence ici vendrait la conclusion avant d'avoir posé la
  // question, et doublonnerait le dernier repère de ValueStory.
  it("rend l'absence, jamais l'état de présence", () => {
    expect(markup).toContain("not cited in this answer");
    expect(markup).toContain(VALUE_STORY_ANSWER.before.text);
    expect(markup).not.toContain(VALUE_STORY_ANSWER.after.text);
  });

  it("ne cite aucune source de la marque suivie", () => {
    for (const citation of VALUE_STORY_ANSWER.after.citations) {
      if (!("brand" in citation && citation.brand)) continue;
      expect(markup).not.toContain(citation.sourceDomain);
    }
  });

  // Un second jeu de valeurs dériverait du premier dès la première réécriture, et la page
  // raconterait deux exemples au lieu d'un. La carte LIT la fixture de ValueStory.
  it("lit la même fixture que la storyboard, sans la redéclarer", () => {
    expect(markup).toContain(VALUE_STORY_ANSWER.question);
    expect(markup).toContain(TRACKED_BRAND);
    for (const citation of VALUE_STORY_ANSWER.before.citations) {
      expect(markup).toContain(citation.sourceDomain);
    }
  });

  // L'étiquette d'illustration doit être lue avant le contenu, par une personne comme par un
  // lecteur d'écran. On vérifie l'ORDRE dans le markup, pas seulement la présence.
  it("annonce « Illustrative » avant le corps de la réponse", () => {
    expect(markup.indexOf("Illustrative")).toBeGreaterThan(-1);
    expect(markup.indexOf("Illustrative")).toBeLessThan(
      markup.indexOf(VALUE_STORY_ANSWER.before.text)
    );
    expect(markup).toContain('aria-labelledby="hero-answer-title"');
  });

  // App-like, pas app-fake : rien à actionner, donc rien qui puisse laisser croire qu'un
  // traitement se déclenche. Et pas une ligne de JavaScript envoyée pour un objet immobile.
  it("n'expose aucun contrôle et reste un composant serveur", () => {
    expect(markup).not.toContain("<button");
    expect(markup).not.toContain("<input");
    const source = readFileSync(
      path.join(REPO_ROOT, "components/product/HeroAnswerCard.tsx"),
      "utf8"
    );
    expect(source).not.toContain("use client");
  });
});

describe("carte de réponse — gates de surface", () => {
  // Même verrou que la homepage : une capacité non commercialisable SUR CETTE SURFACE n'a rien à
  // faire dans une copy de hero, quel que soit son statut d'implémentation.
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
    const block = css.slice(css.indexOf("CARTE DE RÉPONSE DU HERO"));

    expect(block.length).toBeGreaterThan(0);
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(block).not.toMatch(/\brgba?\(/);
  });
});
