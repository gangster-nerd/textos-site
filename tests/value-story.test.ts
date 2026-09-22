// SITE-R1-VALUE-STORY-1 — la nuance de causalité est un CONTRAT, pas une bonne intention. Une
// publication ne garantit jamais une citation ; ces tests cassent le build si cette nuance
// disparaît ou si une formulation d'automatisme s'y glisse.

import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, test } from "vitest";

import {
  TRACKED_BRAND,
  VALUE_STORY_ANSWER,
  VALUE_STORY_CAUSALITY_DISCLAIMER,
} from "@/lib/product-proof/value-story-example";

const ROOT = process.cwd();

describe("récit de valeur — aucune causalité garantie", () => {
  test("la nuance nie explicitement la garantie de citation", () => {
    const lower = VALUE_STORY_CAUSALITY_DISCLAIMER.toLowerCase();
    expect(lower).toContain("does not guarantee");
  });

  test("aucune formulation d'automatisme dans la nuance ni dans le composant", () => {
    const componentSrc = readFileSync(
      path.join(ROOT, "components", "product", "ValueStory.tsx"),
      "utf8"
    ).toLowerCase();
    for (const forbidden of [
      "automatically",
      "guaranteed citation",
      "get cited automatically",
      "makes chatgpt cite",
    ]) {
      expect(VALUE_STORY_CAUSALITY_DISCLAIMER.toLowerCase(), forbidden).not.toContain(forbidden);
      expect(componentSrc, forbidden).not.toContain(forbidden);
    }
  });

  test("l'état ABSENT ne nomme pas la marque suivie ; l'état PRESENT la nomme", () => {
    expect(VALUE_STORY_ANSWER.before.text).not.toContain(TRACKED_BRAND);
    expect(VALUE_STORY_ANSWER.after.text).toContain(TRACKED_BRAND);
  });

  test("toute source citée est un domaine .example (RFC 2606), jamais une source réelle", () => {
    for (const c of [...VALUE_STORY_ANSWER.before.citations, ...VALUE_STORY_ANSWER.after.citations]) {
      expect(c.sourceDomain.endsWith(".example"), c.sourceDomain).toBe(true);
    }
  });

  test("aucune preuve inventée (client, uplift, trafic, revenu) dans le composant", () => {
    const componentSrc = readFileSync(
      path.join(ROOT, "components", "product", "ValueStory.tsx"),
      "utf8"
    ).toLowerCase();
    for (const forbidden of ["customer", "testimonial", "uplift", "revenue", "% increase"]) {
      expect(componentSrc, forbidden).not.toContain(forbidden);
    }
  });

  test("le rendu réduit (`prefers-reduced-motion`) ne dépend d'aucune minuterie", () => {
    const src = readFileSync(
      path.join(ROOT, "components", "product", "ValueStory.tsx"),
      "utf8"
    );
    // L'effet qui démarre `setInterval` se referme explicitement quand `reducedMotion !== false` —
    // donc jamais pour un utilisateur qui a demandé moins de mouvement.
    expect(src).toContain('if (reducedMotion !== false) return;');
  });
});
