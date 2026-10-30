import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { ProductEntryCta } from "@/components/conversion/ProductEntryCta";
import { selfServeCtaGate } from "@/lib/commit-to-content/publishability";
import { FORBIDDEN_CONVERSION_PHRASES } from "@/lib/conversion/measurement-request-copy";
import { decideProductEntry, parseProductEntryUrl, PRODUCT_ENTRY_COPY } from "@/lib/conversion/product-entry";
import { loadPinnedManifest } from "@/lib/product-manifest/manifest-schema";

const ELIGIBLE = { eligible: true };
const BASE = {
  mode: "live" as const,
  gate: ELIGIBLE,
  entryUrl: "https://app.textos.io/auth/start",
  contentId: "textos-homepage",
  position: "final" as const,
};

describe("entrée self-serve — décision", () => {
  test("les trois conditions réunies : lien vers /auth/start?intent=measure avec l'attribution du site", () => {
    const decision = decideProductEntry(BASE);
    expect(decision.kind).toBe("render");
    const url = new URL((decision as { href: string }).href);
    expect(url.origin + url.pathname).toBe("https://app.textos.io/auth/start");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      intent: "measure",
      source: "textos-site",
      contentId: "textos-homepage",
      ctaVariant: "product_entry",
      ctaVersion: "1",
      position: "final",
      contentRevision: "0",
    });
  });

  test("mode demo : rendu aussi (la bascule est l'URL configurée, par environnement)", () => {
    expect(decideProductEntry({ ...BASE, mode: "demo" }).kind).toBe("render");
  });

  test("chaque condition manquante suffit à ne rien rendre", () => {
    expect(decideProductEntry({ ...BASE, mode: "off" })).toEqual({ kind: "none", reason: "conversion_off" });
    expect(decideProductEntry({ ...BASE, gate: { eligible: false } })).toEqual({ kind: "none", reason: "self_serve_not_published" });
    expect(decideProductEntry({ ...BASE, entryUrl: undefined })).toEqual({ kind: "none", reason: "entry_url_missing" });
    expect(decideProductEntry({ ...BASE, entryUrl: "   " })).toEqual({ kind: "none", reason: "entry_url_missing" });
    expect(decideProductEntry({ ...BASE, entryUrl: "http://app.textos.io/auth/start" })).toEqual({ kind: "none", reason: "entry_url_invalid" });
  });

  test("l'URL de passage respecte exactement le contrat", () => {
    expect(parseProductEntryUrl("https://app.textos.io/auth/start")?.origin).toBe("https://app.textos.io");
    for (const bad of [
      "https://app.textos.io/auth/sign-in",
      "https://app.textos.io/auth/start/",
      "https://app.textos.io/auth/start?returnTo=/x",
      "https://app.textos.io/auth/start#x",
      "https://user:pass@app.textos.io/auth/start",
      "javascript:alert(1)",
      "/auth/start",
    ]) {
      expect(parseProductEntryUrl(bad), bad).toBeNull();
    }
  });
});

describe("entrée self-serve — copy et rendu", () => {
  test("la copy ne promet rien d'interdit", () => {
    const text = Object.values(PRODUCT_ENTRY_COPY).join(" ").toLowerCase();
    for (const phrase of FORBIDDEN_CONVERSION_PHRASES) expect(text).not.toContain(phrase);
    for (const fake of ["sign up", "start for free", "try it now", "coming soon", "open textos"]) expect(text).not.toContain(fake);
  });

  test("`none` ne rend rien ; `render` rend un seul lien, vers la décision", () => {
    expect(renderToStaticMarkup(<ProductEntryCta decision={{ kind: "none", reason: "entry_url_missing" }} />)).toBe("");
    const decision = decideProductEntry(BASE);
    const html = renderToStaticMarkup(<ProductEntryCta decision={decision} />);
    expect(html).toContain("data-product-entry");
    expect((html.match(/<a /g) ?? []).length).toBe(1);
    expect(html).toContain(`href="${(decision as { href: string }).href.replace(/&/g, "&amp;")}"`);
  });
});

describe("entrée self-serve — état réel du site", () => {
  test("le manifeste épinglé publie le self-serve (ADR-027) : la porte ne s'ouvre qu'avec l'URL de passage configurée", () => {
    // Décision de publication du 2026-10-27 : les trois capacités sont commercialisables en homepage
    // et FAQ. L'éligibilité produit est acquise ; l'entrée ne se rend que si `PRODUCT_ENTRY_URL`
    // est configurée (et la conversion active) — ce que `decideProductEntry` vérifie à part.
    const gate = selfServeCtaGate(loadPinnedManifest(process.cwd()));
    expect(gate.eligible).toBe(true);
    expect(gate.missingCapabilities).toEqual([]);
  });

  const HOME_HTML = path.resolve("out/index.html");
  test.skipIf(!existsSync(HOME_HTML))("la page d'accueil exportée ne porte aucune entrée produit tant que la porte est fermée", () => {
    expect(readFileSync(HOME_HTML, "utf8")).not.toContain("data-product-entry");
  });
});
