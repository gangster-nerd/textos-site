// Verrou STRUCTUREL sur le workflow.
//
// Les autres tests vérifient que le code refuse ce qu'il doit refuser. Celui-ci vérifie que le
// refus est BRANCHÉ : un gate parfaitement écrit mais que la CI n'exécute plus ne protège rien, et
// sa disparition ne fait rougir aucun test.
//
// C'est la leçon de la version précédente, où `verify:product-manifest` était accroché à
// `matrix.conversion_mode == 'demo'` : renommer ce mode aurait suffi à faire disparaître le gate
// sans bruit, en laissant la CI verte.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const WORKFLOW = readFileSync(
  path.join(process.cwd(), ".github", "workflows", "ci.yml"),
  "utf8"
);

describe("contrat de CI", () => {
  test("un job exécute la vérification de dérive et de provenance", () => {
    expect(WORKFLOW).toMatch(/^\s*- run: pnpm verify:product-manifest\s*$/m);
  });

  test("cette exécution n'est conditionnée à aucune valeur de matrice", () => {
    // On isole le bloc de la commande et ses lignes suivantes : un `if:` accroché à la matrice y
    // réintroduirait la fragilité qu'on vient de retirer.
    const lines = WORKFLOW.split("\n");
    const index = lines.findIndex((line) => /- run: pnpm verify:product-manifest/.test(line));
    expect(index).toBeGreaterThan(-1);

    const following = lines.slice(index + 1, index + 3).join("\n");
    expect(following).not.toMatch(/if:\s*matrix\./);
  });

  test("le job dédié existe et ne dépend pas de la matrice de conversion", () => {
    expect(WORKFLOW).toMatch(/^ {2}product-truth:$/m);

    const job = WORKFLOW.slice(WORKFLOW.indexOf("\n  product-truth:"));
    expect(job).not.toMatch(/strategy:/);
    expect(job).not.toMatch(/conversion_mode/);
  });

  test("les deux contrats de mode restent éprouvés par la matrice", () => {
    // Garde-fou complémentaire : déplacer la vérification hors matrice ne doit pas avoir affaibli
    // la matrice elle-même, qui prouve les deux modes de conversion.
    expect(WORKFLOW).toMatch(/conversion_mode: \["off", "demo"\]/);
  });

  // PR21-FINAL-RELEASE-GATE §7 — le workflow doit exécuter une vérification
  // qui BUILD AVANT les tests, sinon les suites qui inspectent `out/` échouent
  // sur runner GitHub sans que le vert local le prédise. La commande
  // autoritaire est `pnpm verify:a3r` (ou une commande équivalente qui
  // enchaîne rm -rf out → build → vitest → validate:jsonld → verify:a2r).
  //
  // Ce test détecte précisément la classe de panne du run 35247495182 :
  // `pnpm test` invoqué avant `pnpm build`.
  test("build-validate n'exécute pas `pnpm test` avant `pnpm build`", () => {
    const job = WORKFLOW.slice(
      WORKFLOW.indexOf("build-validate:"),
      WORKFLOW.indexOf("\n  product-truth:"),
    );
    const testIndex = job.indexOf("pnpm test");
    const buildIndex = job.indexOf("pnpm build");
    // Cas OK : la commande `verify:a3r` remplace la séquence explicite.
    if (job.includes("pnpm verify:a3r")) {
      // Ni `pnpm test` NI `pnpm build` bruts ne sont autorisés en dehors de
      // `verify:a3r` — un `- run: pnpm test` séparé reviendrait à la classe
      // de panne d'origine.
      expect(testIndex, "aucun `pnpm test` isolé n'est autorisé si verify:a3r est utilisé").toBe(-1);
      return;
    }
    // Sinon on VÉRIFIE l'ordre strict : build avant test.
    expect(testIndex).toBeGreaterThan(-1);
    expect(buildIndex).toBeGreaterThan(-1);
    expect(
      buildIndex,
      "`pnpm build` doit précéder `pnpm test` afin que les suites de sortie disposent de `out/`",
    ).toBeLessThan(testIndex);
  });

  test("build-validate exécute la commande autoritaire `pnpm verify:a3r`", () => {
    const job = WORKFLOW.slice(
      WORKFLOW.indexOf("build-validate:"),
      WORKFLOW.indexOf("\n  product-truth:"),
    );
    expect(job).toContain("pnpm verify:a3r");
  });
});
