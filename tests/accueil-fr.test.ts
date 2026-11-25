// Page d'accueil française (décision de Marc du 25/11/2026). Garde-fous de vérité publique.
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { CAPABILITY_REGISTRY, isMarketableOn, type CapabilityId } from "@/lib/capability-registry";
import { FR_CAPABILITY_LABELS } from "@/lib/i18n/fr-homepage";

const ROOT = process.cwd();
const accueil = readFileSync(path.join(ROOT, "app", "page.tsx"), "utf8");

describe("page d'accueil française", () => {
  test("chaque capacité affichée sur la page d'accueil a un libellé français", () => {
    const shown = (Object.keys(CAPABILITY_REGISTRY) as CapabilityId[]).filter((id) =>
      isMarketableOn(CAPABILITY_REGISTRY[id], "homepage"),
    );
    expect(shown.length).toBeGreaterThan(0);
    for (const id of shown) expect(FR_CAPABILITY_LABELS[id], id).toBeTruthy();
  });

  test("WordPress et la rédaction (bêta dans le manifeste produit) portent le label Bêta, sans date", () => {
    expect(accueil).toMatch(/WordPress[\s\S]{0,200}Bêta/);
    expect(accueil).toMatch(/Vous approuvez[\s\S]{0,200}Bêta/);
    expect(accueil).not.toMatch(/disponible (le|dès|en) /i);
  });

  test("aucune garantie, aucune comparaison, aucun superlatif", () => {
    // « ne garantit pas une citation » est la nuance obligatoire ; toute autre garantie est interdite.
    const text = accueil.replace(/^\s*\/\/.*$/gm, "").replace(/ne garantit pas/g, "");
    for (const forbidden of [/garanti/i, /meilleur/i, /premier/i, /n°\s?1/i, /peec|profound|getmint/i, /toutes les réponses/i]) {
      expect(text).not.toMatch(forbidden);
    }
  });

  test("la page est déclarée en français et pointe vers la version anglaise", () => {
    expect(accueil).toContain('lang="fr"');
    expect(accueil).toContain('href="/en"');
    expect(readFileSync(path.join(ROOT, "app", "en", "page.tsx"), "utf8")).toContain('href="/"');
  });
});
