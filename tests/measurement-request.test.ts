// Tests S2 — copy de conversion gouvernée et préconditions de livraison du CTA.
//
// Le fil directeur : rien de ce qui est promis publiquement ne doit pouvoir échapper au repo, et un
// CTA ne peut pas être approuvé tant que ce qu'il promet n'existe pas réellement.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, test, vi } from "vitest";

import { findClaim } from "@/lib/claims-registry";
import { getCtaVariant } from "@/lib/conversion/cta-registry";
import {
  ctaDeliveryViolations,
  ctaViolations,
  type CtaDeliveryContext,
} from "@/lib/conversion/cta-resolver";
import { DEMO_BANNER } from "@/components/conversion/DemoDisclosure";
import { DEMO_SUBMISSION_NOTICE } from "@/components/conversion/DemoSubmissionNotice";
import {
  FORBIDDEN_CONVERSION_PHRASES,
  MEASUREMENT_REQUEST_COPY,
  MeasurementRequestCopySchema,
} from "@/lib/conversion/measurement-request-copy";

const ROOT = process.cwd();
const CTA = getCtaVariant("measurement_request")!;

// Contexte par défaut : mode `live` complet — c'est l'état le plus exigeant, donc la meilleure
// référence pour éprouver les préconditions une par une.
const ctx = (over: Partial<CtaDeliveryContext> = {}): CtaDeliveryContext => ({
  mode: "live",
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
      { ...CTA, claimIds: ["s8-answer-evidence-capture"] },
      "faq_entry"
    );
    expect(problems.join(" ")).toMatch(/non autorisé sur la surface sales_copy/);
  });

  test("un claim hors requiredCapabilities est rejeté", () => {
    const problems = ctaViolations(
      {
        ...CTA,
        requiredCapabilities: ["quality-ledger"],
        claimIds: ["sales-authority-presence-measurement"],
      },
      "faq_entry"
    );
    expect(problems.join(" ")).toMatch(/hors des requiredCapabilities/);
  });

  test("la configuration réelle du CTA ne viole plus aucune règle de claims", () => {
    const problems = ctaViolations(CTA, "faq_entry");
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

describe("modes de conversion — la livraison, jamais la proposition", () => {
  test("off → aucun CTA livrable", () => {
    const problems = ctaDeliveryViolations(CTA, ctx({ mode: "off" }));
    expect(problems.join(" ")).toMatch(/mode de conversion/);
  });

  test("demo → livrable SANS endpoint ni mentions légales (rien n'est transmis)", () => {
    const problems = ctaDeliveryViolations(
      CTA,
      ctx({ mode: "demo", endpointConfigured: false, legalNoticePublished: false })
    );
    expect(problems).toEqual([]);
  });

  test("demo → la route doit tout de même exister", () => {
    const problems = ctaDeliveryViolations(CTA, ctx({ mode: "demo", routeExists: () => false }));
    expect(problems.join(" ")).toMatch(/n'est pas une route exportée/);
  });

  test("live → endpoint et mentions légales redeviennent exigés", () => {
    const problems = ctaDeliveryViolations(
      CTA,
      ctx({ mode: "live", endpointConfigured: false, legalNoticePublished: false })
    );
    expect(problems).toHaveLength(2);
  });
});

describe("la copy ne peut pas venir d'ailleurs que du repo", () => {
  const formPage = path.join(ROOT, "app", "request-measurement", "page.tsx");
  const receivedPage = path.join(ROOT, "app", "request-measurement", "received", "page.tsx");
  const formComponent = path.join(ROOT, "components", "conversion", "MeasurementRequestForm.tsx");

  test("les pages et le composant de formulaire existent dans le repo", () => {
    for (const f of [formPage, receivedPage, formComponent]) {
      expect(existsSync(f), f).toBe(true);
    }
  });

  test("elles lisent le registre de copy, et ne codent aucun texte public en dur", () => {
    for (const file of [formPage, receivedPage]) {
      const src = readFileSync(file, "utf8");
      expect(src).toContain("measurement-request-copy");
      expect(src).not.toContain('"Request an Authority Presence measurement"');
      expect(src).not.toContain('"Request received."');
    }
  });

  test("la soumission de démo est interceptée, sans réseau ni stockage", () => {
    const src = readFileSync(formComponent, "utf8");
    expect(src).toContain("event.preventDefault()");
    expect(src).toContain("/request-measurement/received?mode=demo");
    // Aucune persistance, aucune requête sortante fabriquée à la main.
    for (const forbidden of ["localStorage", "sessionStorage", "document.cookie", "fetch(", "XMLHttpRequest"]) {
      expect(src, `interdit dans le formulaire : ${forbidden}`).not.toContain(forbidden);
    }
  });

  test("aucune valeur saisie ne part dans l'URL de redirection", () => {
    const src = readFileSync(formComponent, "utf8");
    const redirect = /router\.push\("([^"]+)"\)/.exec(src)?.[1] ?? "";
    expect(redirect).toBe("/request-measurement/received?mode=demo");
    for (const field of ["email", "brand", "buyer_questions"]) {
      expect(redirect).not.toContain(field);
    }
  });

  test("les champs d'attribution sont cachés et non personnels", () => {
    const src = readFileSync(formComponent, "utf8");
    for (const field of ["content_ref", "cta_id", "copy_version"]) {
      expect(src).toContain(`name="${field}"`);
    }
    expect(src).toContain('type="hidden"');
  });

  test("les mentions de démonstration sont exactement celles ratifiées", () => {
    expect(DEMO_BANNER).toBe(
      "Demo environment — submissions are simulated and are not sent or stored. Use fictional information only."
    );
    expect(DEMO_SUBMISSION_NOTICE).toBe(
      "Demo submission simulated. No information was sent or stored."
    );
  });

  test("la confirmation principale est identique en démo et en production", () => {
    // Le corps gouverné ne dépend d'aucun mode : aucune branche conditionnelle ne le touche.
    const src = readFileSync(receivedPage, "utf8");
    expect(src).toContain("confirmation.body");
    expect(src).not.toMatch(/isDemo\s*\?[^:]*confirmation/);
  });
});

// ── Invariant : le mode vient du BUILD, jamais de l'URL. ──────────────────────────────────────
//
// `?mode=demo` est une trace de navigation. S'il décidait de la copy, une production réelle
// pourrait afficher « aucune information n'a été transmise » sur simple modification de l'URL, et
// une démo pourrait masquer son disclosure en falsifiant `?mode=live`.
describe("le disclosure de démonstration ne dépend jamais du paramètre d'URL", () => {
  const ENV = { ...process.env };

  async function renderNotice(mode: string | undefined) {
    vi.resetModules();
    if (mode === undefined) delete process.env.CONVERSION_MODE;
    else process.env.CONVERSION_MODE = mode;
    if (mode === "live") {
      // Le mode live exige ses six variables — le garde-fou de `conversion-config` lève sinon.
      // C'est précisément ce qu'on veut : ici on éprouve le disclosure, pas le garde-fou.
      Object.assign(process.env, {
        MEASUREMENT_FORM_ENDPOINT: "https://provider.test/f/x",
        LEGAL_CONTROLLER_NAME: "Nom légal",
        LEGAL_CONTROLLER_ADDRESS: "Adresse professionnelle",
        PRIVACY_CONTACT_EMAIL: "droits@example.test",
        DATA_RETENTION_PERIOD: "12 months after the last contact",
        FORM_PROVIDER_NAME: "Sous-traitant",
      });
    }
    const { DemoSubmissionNotice } = await import(
      "@/components/conversion/DemoSubmissionNotice"
    );
    const { DemoDisclosure } = await import("@/components/conversion/DemoDisclosure");
    return { notice: DemoSubmissionNotice(), banner: DemoDisclosure() };
  }

  afterEach(() => {
    process.env = { ...ENV };
    vi.resetModules();
  });

  test("build demo, aucun paramètre → disclosure visible", async () => {
    const { notice, banner } = await renderNotice("demo");
    expect(notice).not.toBeNull();
    expect(banner).not.toBeNull();
  });

  test("build live, ?mode=demo falsifié → AUCUN disclosure", async () => {
    // Le paramètre n'est même pas lu : le composant ne consulte pas l'URL.
    const { notice, banner } = await renderNotice("live");
    expect(notice).toBeNull();
    expect(banner).toBeNull();
  });

  test("build off → aucun disclosure de démonstration", async () => {
    const { notice, banner } = await renderNotice("off");
    expect(notice).toBeNull();
    expect(banner).toBeNull();
  });

  test("les composants ne lisent jamais searchParams", () => {
    for (const f of ["DemoSubmissionNotice.tsx", "DemoDisclosure.tsx"]) {
      const src = readFileSync(path.join(ROOT, "components", "conversion", f), "utf8");
      expect(src, `${f} ne doit pas lire l'URL`).not.toContain("useSearchParams");
      expect(src).not.toContain("searchParams");
      expect(src).toContain("conversionConfig");
    }
  });
});
