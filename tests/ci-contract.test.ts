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

  test("build-validate requires the cumulative delivery command", () => {
    const job = WORKFLOW.slice(WORKFLOW.indexOf("build-validate:"), WORKFLOW.indexOf("\n  product-truth:"));
    expect(job).toContain('pnpm verify:delivery --conversion "$CONVERSION_MODE"');
    expect(job).not.toContain("- run: pnpm test");
    expect(job).not.toContain("- run: pnpm build");
  });

  test("local CI and workflow cannot substitute editorial certification for delivery", () => {
    const local = readFileSync(path.join(process.cwd(), "scripts/local-ci.sh"), "utf8");
    const runner = readFileSync(path.join(process.cwd(), "scripts/verify-delivery.ts"), "utf8");
    expect(local).toContain("exec pnpm verify:delivery");
    expect(runner).toContain("assessDelivery(source, conversions, receipts)");
    expect(runner).toContain('"verify:a3r"');
    expect(runner).toContain('"verify:production"');
    expect(runner).toContain('["worktree", "add", "--detach", workspace, source.sha]');
  });
});
