// MEASUREMENT-REQUEST-CAPTURE-1 — focused invariants for the governed
// measurement-request capture surface. No live provider POST is executed.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  resolveMeasurementRequestCapability,
  measurementRequestCapability,
} from "@/lib/config/measurement-request-config";
import { deriveResolvedConversionPlan } from "@/lib/content-surface-engine/site-integration/conversion-plan";
import { conversionConfig } from "@/lib/conversion/conversion-config";
import { listInsightEntries } from "@/lib/content-surface-engine/site-integration/insights-catalog";

const OUT_DIR = path.resolve("out");
const hasBuild = fs.existsSync(path.join(OUT_DIR, "request-measurement.html"));

// Portage PR #22 sur main (Merge #24) : la capacité n'est plus codée en dur (endpoint, identité du
// responsable, contact) ; elle est dérivée de `conversionConfig`, seule source de la livraison.
describe("MEASUREMENT-REQUEST-CAPTURE-1 — capability derived from conversionConfig", () => {
  const legal = {
    controllerName: "controller",
    controllerAddress: "address",
    privacyContactEmail: "contact",
    dataRetentionPeriod: "retention",
    formProviderName: "provider",
  };

  it("mode off → unconfigured, no endpoint, no identity", () => {
    const cap = resolveMeasurementRequestCapability({ mode: "off", formEndpoint: null, legalNotice: null });
    expect(cap.state).toBe("unconfigured");
    expect(cap.endpoint).toBeNull();
    expect(cap.controllerName).toBeNull();
    expect(cap.privacyContactEmail).toBeNull();
    expect(cap.privacyUrl).toBe("/privacy");
  });

  it("mode demo → configured (simulated submission), still no endpoint", () => {
    const cap = resolveMeasurementRequestCapability({ mode: "demo", formEndpoint: null, legalNotice: null });
    expect(cap.state).toBe("configured");
    expect(cap.endpoint).toBeNull();
  });

  it("mode live → configured only with endpoint AND published legal notice", () => {
    const ok = resolveMeasurementRequestCapability({
      mode: "live",
      formEndpoint: "https://receiver.invalid/f/x",
      legalNotice: legal,
    });
    expect(ok.state).toBe("configured");
    expect(ok.endpoint).toBe("https://receiver.invalid/f/x");
    expect(ok.controllerName).toBe("controller");
    expect(ok.privacyContactEmail).toBe("contact");
    for (const broken of [
      { mode: "live" as const, formEndpoint: null, legalNotice: legal },
      { mode: "live" as const, formEndpoint: "", legalNotice: legal },
      { mode: "live" as const, formEndpoint: "https://receiver.invalid/f/x", legalNotice: null },
    ]) {
      expect(resolveMeasurementRequestCapability(broken).state).toBe("unconfigured");
    }
  });

  it("the module-level capability follows the build's conversion mode", () => {
    expect(measurementRequestCapability.state).toBe(
      conversionConfig.isOff ? "unconfigured" : "configured",
    );
  });

  it("no endpoint, identity or contact is hard-coded in the capability module", () => {
    const src = fs.readFileSync(path.resolve("lib/config/measurement-request-config.ts"), "utf8");
    expect(src).not.toMatch(/https?:\/\//);
    expect(src).not.toMatch(/@[a-z0-9-]+\./i);
  });
});

describe("MEASUREMENT-REQUEST-CAPTURE-1 — strict capability gate on the conversion plan", () => {
  const baseInput = {
    resolved: {
      conversion: { effectiveCtaAllowed: true },
    } as never,
    cta: {
      variantId: "measurement_request",
      version: 1,
      destination: "/request-measurement",
      title: "t",
      body: "b",
      primaryLabel: "p",
    } as never,
    sourceRelated: null,
    computedRelated: [
      {
        documentId: "textos-insight:x",
        slug: "x",
        title: "T",
        description: "D",
        href: "/insights/x",
        isDraft: false,
        reasons: [],
        score: 1,
      },
    ] as never,
    newsletterEnabled: false,
  };

  function planWith(cap: unknown) {
    return deriveResolvedConversionPlan({
      ...baseInput,
      commercialCapability: cap as never,
    });
  }

  it("configured (strict) → header/contextual/final present", () => {
    const plan = planWith("configured");
    expect(plan.commercial.enabled).toBe(true);
    expect(plan.commercial.header).not.toBeNull();
    expect(plan.commercial.contextual).not.toBeNull();
    expect(plan.commercial.final).not.toBeNull();
    expect(plan.editorialNextStep).not.toBeNull();
  });

  it("unconfigured → all commercial slots suppressed, editorial next step preserved", () => {
    const plan = planWith("unconfigured");
    expect(plan.commercial.enabled).toBe(false);
    expect(plan.commercial.header).toBeNull();
    expect(plan.commercial.contextual).toBeNull();
    expect(plan.commercial.final).toBeNull();
    expect(plan.editorialNextStep).not.toBeNull();
  });

  it.each([
    ["boolean false", false],
    ["boolean true (rejected by strict positive)", true],
    ["undefined", undefined],
    ["null", null],
    ["empty string", ""],
    ["arbitrary string", "off"],
    ["numeric 1", 1],
    ["object", { state: "configured" }],
  ])("%s → fail-closed (all commercial slots absent, editorial next step preserved)", (_label, value) => {
    const plan = planWith(value);
    expect(plan.commercial.enabled).toBe(false);
    expect(plan.commercial.header).toBeNull();
    expect(plan.commercial.contextual).toBeNull();
    expect(plan.commercial.final).toBeNull();
    expect(plan.editorialNextStep).not.toBeNull();
  });
});

// Le doublon de formulaire de PR #22 (MeasurementRequestCaptureForm) est supprimé (décision CPO du
// 27/10/2026) : le seul formulaire est celui de main, couvert par tests/measurement-request.test.ts.

describe.skipIf(!hasBuild)("MEASUREMENT-REQUEST-CAPTURE-1 — configured cohort", () => {
  const OUT_INSIGHTS = path.resolve("out/insights");
  const files = fs
    .readdirSync(OUT_INSIGHTS)
    .filter((f) => f.endsWith(".html") && !f.startsWith("__"))
    .sort();
  // Cohorte commerciale tirée des documents, pas d'une liste figée.
  const measureBrandSlugs = listInsightEntries()
    .filter(
      (e) =>
        e.document.conversion.conversionAllowed &&
        e.document.conversion.ctaIntentId === "MEASURE_BRAND",
    )
    .map((e) => e.slug);

  it.runIf(measurementRequestCapability.state === "configured")(
    "every MEASURE_BRAND article resolves an actionable /request-measurement destination",
    () => {
      expect(measureBrandSlugs.length).toBe(9);
      for (const slug of measureBrandSlugs) {
        const html = fs.readFileSync(path.join(OUT_INSIGHTS, `${slug}.html`), "utf8");
        expect(html, slug).toMatch(/href="\/request-measurement\?source=textos-site&amp;/);
        expect(html, slug).toContain("Request your first measurement");
      }
    },
  );

  it.runIf(measurementRequestCapability.state !== "configured")(
    "capability unconfigured → no article links to /request-measurement",
    () => {
      for (const f of files) {
        const html = fs.readFileSync(path.join(OUT_INSIGHTS, f), "utf8");
        expect(html, f).not.toContain('href="/request-measurement');
        expect(html, f).not.toContain("Request your first measurement");
      }
    },
  );

  it("every insights page (managed corpus + CTC notes) remains noindex/nofollow", () => {
    expect(files.length).toBe(listInsightEntries().length);
    for (const f of files) {
      const html = fs.readFileSync(path.join(OUT_INSIGHTS, f), "utf8");
      expect(html).toMatch(/<meta name="robots" content="noindex[,\s]*nofollow"/i);
    }
  });
});
