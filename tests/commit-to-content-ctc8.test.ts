// Tests CTC-8 — verification closure : content:verify auto-suffisant, canonical binding
// non-bypassable, mutations discriminantes avec recompute sha256.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  COMMIT_TO_CONTENT_CANONICAL_EDITORIAL_PATH,
  COMMIT_TO_CONTENT_CANONICAL_FRONTMATTER,
} from "@/lib/commit-to-content/editorial-frontmatter";
import { verifyEditorialCandidates } from "@/lib/commit-to-content/editorial-verifier";
import type { EditorialCandidate } from "@/lib/commit-to-content/types";

const SITE_ROOT = new URL("..", import.meta.url).pathname;
const bundleDir = path.join(SITE_ROOT, "content-bundles/authoritative-a0efa14");
const editorialAbs = path.join(bundleDir, COMMIT_TO_CONTENT_CANONICAL_EDITORIAL_PATH);
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

// Snapshot d'origine lu depuis le blob git (garanti pristine, insensible aux mutations
// laissées par d'autres tests concurrents). Fallback disque si git inaccessible.
function loadPristineOriginal(): string {
  try {
    return execFileSync(
      "git",
      [
        "-C",
        SITE_ROOT,
        "show",
        `HEAD:content-bundles/authoritative-a0efa14/${COMMIT_TO_CONTENT_CANONICAL_EDITORIAL_PATH}`,
      ],
      { encoding: "utf8" },
    );
  } catch {
    return readFileSync(editorialAbs, "utf8");
  }
}

let original = loadPristineOriginal();
beforeAll(() => {
  original = loadPristineOriginal();
  writeFileSync(editorialAbs, original, "utf8");
});

const readBundle = () =>
  JSON.parse(readFileSync(path.join(bundleDir, "bundle.json"), "utf8"));

// Helper : mute le fichier canonique, régénère le hash côté "bundle" (pour prouver que la
// détection vient de la liaison canonique et NON du hash), puis appelle le verifier.
function mutateAndVerify(mutated: string) {
  writeFileSync(editorialAbs, mutated, "utf8");
  const bundle = readBundle();
  const updated: EditorialCandidate[] = bundle.editorialCandidates.map(
    (c: EditorialCandidate) =>
      c.path === COMMIT_TO_CONTENT_CANONICAL_EDITORIAL_PATH
        ? { ...c, sha256: sha256(mutated) }
        : c,
  );
  return verifyEditorialCandidates({
    bundleDir,
    editorialCandidates: updated,
    selfServeEligible: false,
    siteRoot: SITE_ROOT,
    truthLevel: bundle.truthLevel,
    overallStatus: bundle.overallStatus,
  });
}

// Restauration après CHAQUE test — évite qu'une assertion échouée laisse le fichier muté
// pour le suivant.
afterEach(() => writeFileSync(editorialAbs, original, "utf8"));
afterAll(() => writeFileSync(editorialAbs, original, "utf8"));

describe("CTC-8 §2 — canonical constant inclut capabilityId", () => {
  it("le contrat canonique déclare explicitement capabilityId=commit-to-content", () => {
    expect(COMMIT_TO_CONTENT_CANONICAL_FRONTMATTER.capabilityId).toBe("commit-to-content");
  });
  it("le chemin canonique est déclaré", () => {
    expect(COMMIT_TO_CONTENT_CANONICAL_EDITORIAL_PATH).toBe(
      "editorial/commit-to-content-technology-story.md",
    );
  });
});

describe("CTC-8 §3 — mutations discriminantes (sha256 recomputé)", () => {
  it("baseline: fichier canonique inchangé + hash correct → aucune failure canonical", () => {
    const failures = mutateAndVerify(original);
    expect(failures.filter((f) => f.message.includes("canonical"))).toEqual([]);
    // Restauration explicite pour la suite.
    writeFileSync(editorialAbs, original, "utf8");
  });

  it("mutation cta: none → cta: contact (sha recomputé) → failure canonical spécifique cta", () => {
    const failures = mutateAndVerify(original.replace("cta: none", "cta: contact"));
    const cta = failures.find((f) => f.message.includes("canonical: frontmatter.cta"));
    expect(cta, `failures obtenus : ${JSON.stringify(failures)}`).toBeDefined();
    expect(cta!.message).toContain(`"contact"`);
    writeFileSync(editorialAbs, original, "utf8");
  });

  it("mutation disclosureDecisionRef (sha recomputé) → failure canonical spécifique", () => {
    const mutated = original.replace(
      "disclosureDecisionRef: docs/decisions/CPO-2026-09-12-commit-to-content-disclosure.md",
      "disclosureDecisionRef: docs/decisions/rogue.md",
    );
    const failures = mutateAndVerify(mutated);
    const decRef = failures.find((f) =>
      f.message.includes("canonical: frontmatter.disclosureDecisionRef"),
    );
    expect(decRef, `failures obtenus : ${JSON.stringify(failures)}`).toBeDefined();
    expect(decRef!.message).toContain(`"docs/decisions/rogue.md"`);
    expect(decRef!.message).toContain(
      `"docs/decisions/CPO-2026-09-12-commit-to-content-disclosure.md"`,
    );
  });

  it("mutation capabilityId (sha recomputé) → failure canonical spécifique capabilityId", () => {
    const mutated = original.replace(
      "capabilityId: commit-to-content",
      "capabilityId: some-other-id",
    );
    const failures = mutateAndVerify(mutated);
    const capId = failures.find((f) => f.message.includes("canonical: frontmatter.capabilityId"));
    expect(capId).toBeDefined();
    expect(capId!.message).toContain(`"some-other-id"`);
    writeFileSync(editorialAbs, original, "utf8");
  });

  it("mutation storyKind (sha recomputé) → failure canonical spécifique storyKind", () => {
    const mutated = original.replace(
      "storyKind: COMPANY_TECHNOLOGY",
      "storyKind: PRODUCT_CAPABILITY",
    );
    const failures = mutateAndVerify(mutated);
    // storyKind=PRODUCT_CAPABILITY + le chemin reste canonique → l'ancrage sur le CHEMIN
    // canonique déclenche encore la vérification, qui refuse la nouvelle valeur.
    const sk = failures.find((f) => f.message.includes("canonical: frontmatter.storyKind"));
    expect(sk).toBeDefined();
    expect(sk!.message).toContain(`"PRODUCT_CAPABILITY"`);
    writeFileSync(editorialAbs, original, "utf8");
  });
});

describe("CTC-8 §1 — content:verify rejette un frontmatter avec champ inconnu même si bundle et hash sont cohérents", () => {
  it("insertion d'un champ inconnu → frontmatter schema strict échoue", () => {
    const mutated = original.replace(
      /^---\n/,
      "---\nmysteryField: pwn\n",
    );
    const failures = mutateAndVerify(mutated);
    const schemaFail = failures.find((f) =>
      f.message.includes("Frontmatter éditorial non-conforme au schéma strict"),
    );
    expect(schemaFail, `failures obtenus : ${JSON.stringify(failures)}`).toBeDefined();
    expect(schemaFail!.message).toContain("mysteryField");
    writeFileSync(editorialAbs, original, "utf8");
  });
});

describe("CTC-8 §4 — FAQ decision basis liste m2/m3/m4/m5/m6", () => {
  const faq = readFileSync(
    path.join(SITE_ROOT, "content-bundles/authoritative-a0efa14/editorial/faq.md"),
    "utf8",
  );
  it("decision basis inclut la liste complète", () => {
    expect(faq).toContain("m2, m3, m4, m5 and m6");
  });
});
