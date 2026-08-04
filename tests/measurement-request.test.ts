// Tests S2 — copy de conversion gouvernée et préconditions de livraison du CTA.
//
// Le fil directeur : rien de ce qui est promis publiquement ne doit pouvoir échapper au repo, et un
// CTA ne peut pas être approuvé tant que ce qu'il promet n'existe pas réellement.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { findClaim } from "@/lib/claims-registry";
import { getCtaVariant } from "@/lib/conversion/cta-registry";
import {
  ctaDeliveryViolations,
  ctaViolations,
  type CtaDeliveryContext,
} from "@/lib/conversion/cta-resolver";
import {
  FORBIDDEN_CONVERSION_PHRASES,
  MEASUREMENT_REQUEST_COPY,
  MeasurementRequestCopySchema,
} from "@/lib/conversion/measurement-request-copy";

const ROOT = process.cwd();
const CTA = getCtaVariant("measurement_request")!;

const ctx = (over: Partial<CtaDeliveryContext> = {}): CtaDeliveryContext => ({
  routeExists: () => true,
  endpointConfigured: true,
  legalNoticePublished: true,
  ...over,
});

describe("claims commerciaux (S2.0A)", () => {
  test("les trois claims du CTA existent, sont sur sales_copy et portent la capacité du CTA", () => {
    expect(CTA.requiredCapabilities).toEqual(["observe-authority-presence"]);
    expect(CTA.claimIds).toHaveLength(3);
    for (const id of CTA.claimIds) {
      const claim = findClaim(id);
      expect(claim, `${id} introuvable`).toBeDefined();
      expect(claim!.allowedSurfaces, `${id} hors sales_copy`).toContain("sales_copy");
      expect(CTA.requiredCapabilities).toContain(claim!.capabilityId!);
    }
  });

  test("HP1/HP2 restent inutilisables par un CTA (capabilityId null)", () => {
    for (const id of ["hp1-measurement-doctrine", "hp2-metric-integrity"]) {
      const claim = findClaim(id)!;
      expect(claim.capabilityId).toBeNull();
      expect(claim.allowedSurfaces).not.toContain("sales_copy");
    }
  });

  test("le CTA ne porte plus de claim doctrinal", () => {
    expect(CTA.claimIds).not.toContain("hp1-measurement-doctrine");
  });

  test("un claim hors sales_copy dans un CTA est rejeté", () => {
    const problems = ctaViolations(
      { ...CTA, status: "approved", claimIds: ["s8-answer-evidence-capture"] },
      "faq_entry"
    );
    expect(problems.join(" ")).toMatch(/non autorisé sur la surface sales_copy/);
  });

  test("un claim hors requiredCapabilities est rejeté", () => {
    const problems = ctaViolations(
      {
        ...CTA,
        status: "approved",
        requiredCapabilities: ["quality-ledger"],
        claimIds: ["sales-authority-presence-measurement"],
      },
      "faq_entry"
    );
    expect(problems.join(" ")).toMatch(/hors des requiredCapabilities/);
  });

  test("la configuration réelle du CTA ne viole plus aucune règle de claims", () => {
    const problems = ctaViolations({ ...CTA, status: "approved" }, "faq_entry");
    expect(problems).toEqual([]);
  });
});

describe("préconditions de livraison (S2.6)", () => {
  test("toutes réunies → aucune violation", () => {
    expect(ctaDeliveryViolations(CTA, ctx())).toEqual([]);
  });

  test("page /request-measurement absente → rejet", () => {
    const problems = ctaDeliveryViolations(CTA, ctx({ routeExists: () => false }));
    expect(problems.join(" ")).toMatch(/n'est pas une route exportée/);
  });

  test("endpoint non configuré → rejet", () => {
    const problems = ctaDeliveryViolations(CTA, ctx({ endpointConfigured: false }));
    expect(problems.join(" ")).toMatch(/aucun endpoint de réception/);
  });

  test("mentions légales non publiées → rejet", () => {
    const problems = ctaDeliveryViolations(CTA, ctx({ legalNoticePublished: false }));
    expect(problems.join(" ")).toMatch(/mentions légales non publiées/);
  });

  test("destination externe → rejet (le parcours ne se délègue pas)", () => {
    const problems = ctaDeliveryViolations(
      { ...CTA, destination: "https://forms.example.com/abc" },
      ctx()
    );
    expect(problems.join(" ")).toMatch(/destination externe/);
  });
});

describe("copy de conversion — gouvernée, jamais promise au-delà du réel", () => {
  test("la confirmation ne contient aucune formulation interdite", () => {
    const texts = [
      MEASUREMENT_REQUEST_COPY.confirmation.title,
      MEASUREMENT_REQUEST_COPY.confirmation.body,
      ...Object.values(MEASUREMENT_REQUEST_COPY.form),
    ].join(" ").toLowerCase();

    for (const phrase of FORBIDDEN_CONVERSION_PHRASES) {
      expect(texts, `formulation interdite : « ${phrase} »`).not.toContain(phrase);
    }
  });

  test("la confirmation nie explicitement acceptation, engagement de réponse et livraison", () => {
    expect(MEASUREMENT_REQUEST_COPY.confirmation.body).toContain(
      "not an acceptance, a commitment to respond, or delivery of a measurement"
    );
  });

  test("l'avertissement du champ libre est présent", () => {
    expect(MEASUREMENT_REQUEST_COPY.form.warning).toBe(
      "Do not include confidential, personal or sensitive information."
    );
  });

  test("une copy vide est rejetée au chargement", () => {
    expect(
      MeasurementRequestCopySchema.safeParse({
        ...MEASUREMENT_REQUEST_COPY,
        confirmation: { ...MEASUREMENT_REQUEST_COPY.confirmation, body: "  " },
      }).success
    ).toBe(false);
  });

  test("un champ spéculatif dans la copy est rejeté (.strict())", () => {
    expect(
      MeasurementRequestCopySchema.safeParse({
        ...MEASUREMENT_REQUEST_COPY,
        tagline: "Best tool ever",
      }).success
    ).toBe(false);
  });
});

describe("la copy ne peut pas venir d'ailleurs que du repo", () => {
  const formPage = path.join(ROOT, "app", "request-measurement", "page.tsx");
  const receivedPage = path.join(ROOT, "app", "request-measurement", "received", "page.tsx");

  test("les deux pages existent dans le repo", () => {
    expect(existsSync(formPage)).toBe(true);
    expect(existsSync(receivedPage)).toBe(true);
  });

  test("elles lisent le registre de copy, et ne codent aucun texte en dur", () => {
    for (const file of [formPage, receivedPage]) {
      const src = readFileSync(file, "utf8");
      expect(src).toContain("measurement-request-copy");
      // Aucune phrase publique littérale : tout passe par le registre.
      expect(src).not.toContain("Request an Authority Presence measurement\"");
      expect(src).not.toContain("Request received.\"");
    }
  });

  test("le formulaire ne se rend pas sans endpoint configuré", () => {
    const src = readFileSync(formPage, "utf8");
    expect(src).toContain("unavailableMessage");
    expect(src).toContain("endpoint === null");
  });

  test("les champs d'attribution sont posés en caché, jamais saisis", () => {
    const src = readFileSync(formPage, "utf8");
    for (const field of ["content_ref", "cta_id", "copy_version"]) {
      expect(src).toContain(`name="${field}"`);
    }
    expect(src).toContain('type="hidden"');
  });
});
