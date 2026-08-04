// Tests du manifeste d'attribution : périmètre (publié + route réelle) et identité partagée.
//
// On teste la LOGIQUE, pas l'artefact : lire `out/…json` ne dirait rien du cas qu'on n'a pas
// rencontré. Le brouillon est donc éprouvé par une projection directe, sans écrire dans `content/`.

import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, test } from "vitest";

import {
  buildManifest,
  routedCollections,
  toManifestEntries,
} from "@/lib/content/attribution-manifest";
import { loadDocument, type ResolvedDocument } from "@/lib/content/content-loader";
import { conversionConfig } from "@/lib/conversion/conversion-config";

const ROOT = process.cwd();
const FAQ_SLUG = "does-textos-automatically-verify-claims";

describe("périmètre du manifeste", () => {
  test("ne retient que les collections ayant une route dynamique exportée", () => {
    const collections = routedCollections(ROOT);
    expect(collections).toContain("faq");
    for (const collection of collections) {
      const route = path.join(ROOT, "app", collection, "[slug]", "page.tsx");
      expect(readFileSync(route, "utf8").length).toBeGreaterThan(0);
    }
  });

  test("contient l'entrée FAQ, avec le CTA réellement résolu pour le mode courant", () => {
    const { entries } = buildManifest(ROOT);
    const faq = entries.find((e) => e.id === `faq:${FAQ_SLUG}`);
    expect(faq).toBeDefined();
    expect(faq?.configuredCtaVariant).toBe("measurement_request");
    // Le manifeste décrit ce qui est RENDU, donc il dépend du mode de livraison — et il doit en
    // dépendre de la même façon que les pages. En `off` rien n'est rendu ; en `demo`/`live` le CTA
    // l'est. Coder `null` en dur ferait échouer le CI dès qu'il valide le vrai mode.
    if (conversionConfig.isOff) {
      expect(faq?.resolvedCtaVariant).toBeNull();
      expect(faq?.ctaVersion).toBeNull();
    } else {
      expect(faq?.resolvedCtaVariant).toBe("measurement_request");
      expect(faq?.ctaVersion).toBe(1);
    }
    expect(faq?.clusterId).toBe("measurement-trust");
    expect(faq?.contentType).toBe("faq_entry");
    expect(faq?.path).toBe(`/faq/${FAQ_SLUG}`);
  });

  test("exclut un brouillon", () => {
    const published = loadDocument("faq", FAQ_SLUG);
    const draft: ResolvedDocument = {
      ...published,
      slug: "brouillon",
      contentId: "faq:brouillon",
      path: "/faq/brouillon",
      frontmatter: { ...published.frontmatter, editorialStatus: "draft" },
    };

    const entries = toManifestEntries([published, draft]);
    expect(entries.map((e) => e.id)).toEqual([`faq:${FAQ_SLUG}`]);
    expect(entries.some((e) => e.id === "faq:brouillon")).toBe(false);
  });

  test("aucune URL absolue dans le manifeste", () => {
    const serialized = JSON.stringify(buildManifest(ROOT));
    expect(serialized).not.toMatch(/https?:\/\//);
  });
});

describe("identité partagée entre loader et manifeste", () => {
  test("le contentId du manifeste est exactement celui du loader", () => {
    const doc = loadDocument("faq", FAQ_SLUG);
    const { entries } = buildManifest(ROOT);
    const faq = entries.find((e) => e.id === doc.contentId);

    expect(doc.contentId).toBe(`faq:${FAQ_SLUG}`);
    expect(faq).toBeDefined();
    expect(faq?.path).toBe(doc.path);
  });

  test("la résolution CTA du manifeste est celle du loader (une seule source)", () => {
    const doc = loadDocument("faq", FAQ_SLUG);
    const faq = buildManifest(ROOT).entries.find((e) => e.id === doc.contentId);
    expect(faq?.configuredCtaVariant).toBe(doc.ctaResolution.configuredVariant);
    expect(faq?.resolvedCtaVariant).toBe(doc.ctaResolution.resolvedVariant);
    expect(faq?.ctaVersion).toBe(doc.ctaResolution.version);
  });
});
