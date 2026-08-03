import { describe, test, expect } from "vitest";
import { ContentFrontmatterSchema } from "@/lib/content/content-schema";
import { runGates } from "@/lib/content/content-gates";

const base = {
  title: "T",
  description: "D",
  contentType: "faq_entry" as const,
  language: "en" as const,
  editorialStatus: "published" as const,
  indexingPolicy: "noindex" as const,
  publishedAt: "2026-07-31",
  updatedAt: "2026-07-31",
  sourceCommit: "1178684",
  capabilityIds: ["claim-evidence-layer"],
  claimIds: ["s8-answer-evidence-capture"],
  // Taxonomie + conversion, requis depuis S1 (validés contre leurs registres par les gates).
  clusterId: "measurement-trust",
  ctaVariant: "measurement_request",
  targetQuery: "q",
  searchIntent: "commercial_investigation" as const,
  shortAnswer: { body: "b", claimIds: ["s8-answer-evidence-capture"] },
};

describe("content gates", () => {
  test("frontmatter valide passe", () => {
    expect(ContentFrontmatterSchema.safeParse(base).success).toBe(true);
  });

  test("statut produit en contrebande rejeté", () => {
    expect(
      ContentFrontmatterSchema.safeParse({ ...base, status: "public_marketable" })
        .success
    ).toBe(false);
  });

  test("draft + index rejeté", () => {
    expect(
      ContentFrontmatterSchema.safeParse({
        ...base,
        editorialStatus: "draft",
        indexingPolicy: "index",
      }).success
    ).toBe(false);
  });

  test("updatedAt antérieur à publishedAt rejeté", () => {
    expect(
      ContentFrontmatterSchema.safeParse({ ...base, updatedAt: "2026-07-01" }).success
    ).toBe(false);
  });

  test("shortAnswer utilisant un claim hors document rejeté", () => {
    expect(
      ContentFrontmatterSchema.safeParse({
        ...base,
        shortAnswer: { body: "b", claimIds: ["hp1-measurement-doctrine"] },
      }).success
    ).toBe(false);
  });

  test("claim doctrinal HP accepté sans capacité déclarée", () => {
    const fm = ContentFrontmatterSchema.parse({
      ...base,
      claimIds: ["s8-answer-evidence-capture", "hp1-measurement-doctrine"],
    });
    expect(() => runGates(fm, "slug-ok")).not.toThrow();
  });

  test("capacité inconnue rejetée", () => {
    const fm = ContentFrontmatterSchema.parse({ ...base, capabilityIds: ["nope"] });
    expect(() => runGates(fm, "slug-ok")).toThrow(/Capacité inconnue/);
  });

  test("claim inconnu rejeté", () => {
    // shortAnswer.claimIds doit rester ⊆ claimIds, sinon le schéma rejette au
    // parse avant d'atteindre les gates : on aligne les deux sur le claim inconnu.
    const fm = ContentFrontmatterSchema.parse({
      ...base,
      claimIds: ["nope"],
      shortAnswer: { body: "b", claimIds: ["nope"] },
    });
    expect(() => runGates(fm, "slug-ok")).toThrow(/Claim inconnu/);
  });

  test("surface interdite pour une capacité wip", () => {
    const fm = ContentFrontmatterSchema.parse({
      ...base,
      contentType: "product_article",
    });
    expect(() => runGates(fm, "slug-ok")).toThrow(/interdite/);
  });

  test("slug avec traversée de chemin rejeté", () => {
    const fm = ContentFrontmatterSchema.parse(base);
    expect(() => runGates(fm, "../secret")).toThrow(/Slug invalide/);
  });
});
