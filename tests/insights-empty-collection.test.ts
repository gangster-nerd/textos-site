// CTC-9A regression : la scaffold /insights doit se construire quand aucun article n'existe
// encore. La collection routée peut être VIDE (les articles vivent dans la branche stackée
// CTC-9B). Un build cassant sur ENOENT rendait CTC-9A non-mergeable indépendamment.

import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { listSlugs, loadCollection } from "@/lib/content/content-loader";

const REPO_ROOT = path.resolve(__dirname, "..");

describe("CTC-9A — /insights supports an empty collection", () => {
  it("listSlugs sur une collection inexistante retourne [] (pas d'ENOENT)", () => {
    // Choisir un nom de collection dont on GARANTIT l'absence sur disque.
    const fabricated = "collection-that-does-not-exist-xyz";
    expect(existsSync(path.join(REPO_ROOT, "content", fabricated))).toBe(false);
    expect(listSlugs(fabricated)).toEqual([]);
  });

  it("loadCollection sur une collection inexistante retourne [] sans lever", () => {
    const fabricated = "collection-that-does-not-exist-xyz";
    const docs = loadCollection(fabricated);
    expect(Array.isArray(docs)).toBe(true);
    expect(docs.length).toBe(0);
  });

  it("insights est routé même sans article : app/insights/page.tsx existe", () => {
    expect(existsSync(path.join(REPO_ROOT, "app", "insights", "page.tsx"))).toBe(true);
    expect(existsSync(path.join(REPO_ROOT, "app", "insights", "[slug]", "page.tsx"))).toBe(true);
  });
});
