// Tests de l'origine du site — le contrat qui empêche une origine de devenir publique par déduction.
//
// `lib/config/site.ts` lit `process.env` au chargement du module : on le réimporte donc avec
// `vi.resetModules()` pour chaque cas, plutôt que de tester une fonction extraite qui ne serait pas
// celle réellement exécutée au build.

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const ENV = { ...process.env };

interface Load {
  origin?: string;
  vercelUrl?: string;
  approved?: string;
  indexable?: string;
}

async function loadConfig({ origin, vercelUrl, approved, indexable }: Load) {
  vi.resetModules();
  for (const [key, value] of Object.entries({
    SITE_ORIGIN: origin,
    VERCEL_URL: vercelUrl,
    PUBLIC_ORIGIN_APPROVED: approved,
    PUBLIC_INDEXABLE_BUILD: indexable,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return (await import("@/lib/config/site")).siteConfig;
}

beforeEach(() => {
  process.env = { ...ENV };
  delete process.env.VERCEL_URL;
  delete process.env.PUBLIC_ORIGIN_APPROVED;
});
afterEach(() => {
  process.env = { ...ENV };
  vi.resetModules();
});

const CONTROLLED = "https://textos.io";

// ── Matrice d'autorisation (arbitrage D0A). ────────────────────────────────────────────────────
describe("matrice origine × approbation × indexation", () => {
  test("localhost · non approuvée · non indexable → build noindex", async () => {
    const c = await loadConfig({ origin: "http://localhost:3000", indexable: "false" });
    expect(c.allowIndexing).toBe(false);
  });

  test("*.vercel.app · non approuvée · non indexable → build noindex", async () => {
    const c = await loadConfig({ origin: "https://textos-site.vercel.app", indexable: "false" });
    expect(c.isProvisional).toBe(true);
    expect(c.allowIndexing).toBe(false);
  });

  test("*.vercel.app · approuvée · indexable → ERREUR", async () => {
    await expect(
      loadConfig({
        origin: "https://textos-site.vercel.app",
        approved: "true",
        indexable: "true",
      })
    ).rejects.toThrow(/ne peut pas être approuvée/);
  });

  test("domaine quelconque NON approuvé · indexable → ERREUR", async () => {
    // Le point central : cette origine n'est reconnue par AUCUNE liste de plateformes. Sans
    // approbation positive, elle passerait — c'est le trou que ferme PUBLIC_ORIGIN_APPROVED.
    await expect(
      loadConfig({ origin: "https://un-domaine-inconnu.example-host.dev", indexable: "true" })
    ).rejects.toThrow(/sans PUBLIC_ORIGIN_APPROVED/);
  });

  test("domaine contrôlé · approuvé · non indexable → build noindex", async () => {
    const c = await loadConfig({ origin: CONTROLLED, approved: "true", indexable: "false" });
    expect(c.isProvisional).toBe(false);
    expect(c.isPublicOriginApproved).toBe(true);
    expect(c.allowIndexing).toBe(false);
  });

  test("domaine contrôlé · approuvé · indexable → build indexable", async () => {
    const c = await loadConfig({ origin: CONTROLLED, approved: "true", indexable: "true" });
    expect(c.allowIndexing).toBe(true);
  });
});

describe("approbation — jamais implicite", () => {
  test("PUBLIC_ORIGIN_APPROVED absent vaut false", async () => {
    const c = await loadConfig({ origin: CONTROLLED, indexable: "false" });
    expect(c.isPublicOriginApproved).toBe(false);
    expect(c.allowIndexing).toBe(false);
  });

  test("une valeur autre que « true » ne vaut pas approbation", async () => {
    for (const value of ["1", "yes", "TRUE", ""]) {
      const c = await loadConfig({ origin: CONTROLLED, approved: value, indexable: "false" });
      expect(c.isPublicOriginApproved, `« ${value} » ne doit pas approuver`).toBe(false);
    }
  });
});

// ── Résolution de l'origine (previews fidèles). ────────────────────────────────────────────────
describe("résolution de l'origine", () => {
  test("VERCEL_URL seule produit l'origine réelle du preview", async () => {
    const c = await loadConfig({ vercelUrl: "branch-preview.vercel.app", indexable: "false" });
    expect(c.origin).toBe("https://branch-preview.vercel.app");
    expect(c.isProvisional).toBe(true);
    expect(c.allowIndexing).toBe(false);
  });

  test("SITE_ORIGIN explicite écrase VERCEL_URL", async () => {
    const c = await loadConfig({
      origin: CONTROLLED,
      vercelUrl: "branch-preview.vercel.app",
      approved: "true",
      indexable: "false",
    });
    expect(c.origin).toBe(CONTROLLED);
  });

  test("sans SITE_ORIGIN ni VERCEL_URL → localhost, provisoire", async () => {
    const c = await loadConfig({ indexable: "false" });
    expect(c.origin).toBe("http://localhost:3000");
    expect(c.isProvisional).toBe(true);
  });

  test("l'origine est normalisée (chemin et query écartés)", async () => {
    const c = await loadConfig({ origin: `${CONTROLLED}/some/path?x=1`, indexable: "false" });
    expect(c.origin).toBe(CONTROLLED);
  });
});

// ── Défense secondaire : la liste des plateformes reste utile, sans être l'autorité. ───────────
describe("détection des origines de plateforme (défense secondaire)", () => {
  test.each([
    "https://textos-site.vercel.app",
    "https://textos-site-git-main-marcprp.vercel.app",
    "https://gangster-nerd.github.io",
    "https://example.pages.dev",
    "https://example.netlify.app",
    "https://example.onrender.com",
    "https://example.fly.dev",
    "http://127.0.0.1:3000",
  ])("%s est reconnue provisoire", async (origin) => {
    const c = await loadConfig({ origin, indexable: "false" });
    expect(c.isProvisional).toBe(true);
  });

  test("un domaine contrôlé n'est pas provisoire", async () => {
    const c = await loadConfig({ origin: CONTROLLED, indexable: "false" });
    expect(c.isProvisional).toBe(false);
  });
});
