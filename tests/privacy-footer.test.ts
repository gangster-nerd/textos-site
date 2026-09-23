// Mentions légales et pied de page — SITE-RC0-CORE.
//
// Deux invariants : `/privacy` ne peut jamais afficher un champ inventé (adresse, contact,
// sous-traitant) quand `conversionConfig.legalNotice` est absent ; et le pied de page pointe vers
// une route qui existe réellement dans le repo, comme le fait déjà `SiteHeader`.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, test } from "vitest";

const ROOT = process.cwd();

describe("/privacy — jamais de donnée inventée", () => {
  const privacyPage = path.join(ROOT, "app", "privacy", "page.tsx");
  const src = readFileSync(privacyPage, "utf8");

  test("la page existe et est statique", () => {
    expect(existsSync(privacyPage)).toBe(true);
    expect(src).toContain('export const dynamic = "force-static"');
  });

  test("elle lit conversionConfig.legalNotice, ne code aucune adresse en dur", () => {
    expect(src).toContain("conversionConfig");
    expect(src).toContain("legalNotice");
    // Aucune valeur de démonstration issue des tests ne doit fuiter dans la page réelle.
    expect(src).not.toContain("Nom légal");
    expect(src).not.toContain("Adresse professionnelle");
  });

  test("l'état non publié est honnête, pas silencieux", () => {
    expect(src).toContain("unpublished");
    expect(src).not.toMatch(/legalNotice\s*!\s*\./);
  });
});

describe("pied de page public — routes réelles seulement", () => {
  const footer = path.join(ROOT, "components", "site", "SiteFooter.tsx");
  const src = readFileSync(footer, "utf8");

  test("le composant existe et est monté par le layout racine", () => {
    expect(existsSync(footer)).toBe(true);
    const layout = readFileSync(path.join(ROOT, "app", "layout.tsx"), "utf8");
    expect(layout).toContain("SiteFooter");
  });

  test("chaque lien du pied de page correspond à une route exportée", () => {
    const hrefs = [...src.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      const segments = href.split("/").filter(Boolean);
      // Route statique directe (ex. /privacy, /faq)…
      const staticFile = path.join(ROOT, "app", ...segments, "page.tsx");
      // …ou route dynamique dont le dernier segment est le slug (ex. /methodology/[slug]).
      const dynamicFile = path.join(
        ROOT,
        "app",
        ...segments.slice(0, -1),
        "[slug]",
        "page.tsx"
      );
      expect(
        existsSync(staticFile) || existsSync(dynamicFile),
        `${href} → ni ${staticFile} ni ${dynamicFile}`
      ).toBe(true);
    }
  });

  test("aucun affordance self-serve ou newsletter dans le pied de page", () => {
    const lower = src.toLowerCase();
    for (const forbidden of ["sign up", "log in", "login", "subscribe", "start now", "run now"]) {
      expect(lower, `interdit dans le footer : ${forbidden}`).not.toContain(forbidden);
    }
  });
});
