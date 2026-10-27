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
const FORM_SOURCE = fs.readFileSync(
  path.resolve("components/conversion/MeasurementRequestCaptureForm.tsx"),
  "utf8",
);

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

describe("MEASUREMENT-REQUEST-QUESTIONS-1 — source-level invariants", () => {
  it("declares MAX_QUESTIONS = 10 and QUESTION_MAX_LENGTH = 300", () => {
    expect(FORM_SOURCE).toMatch(/const\s+MAX_QUESTIONS\s*=\s*10\b/);
    expect(FORM_SOURCE).toMatch(/const\s+QUESTION_MAX_LENGTH\s*=\s*300\b/);
  });

  it("submits questions under the exact repeatable name buyer_questions (no [] / no _N suffix / no concatenation)", () => {
    expect(FORM_SOURCE).toMatch(/name="buyer_questions"/);
    // No array-suffixed or indexed variants that would break repeated FormData values.
    expect(FORM_SOURCE).not.toMatch(/name="buyer_questions\[\]"/);
    expect(FORM_SOURCE).not.toMatch(/name="buyer_questions_\d/);
    // No hidden concatenated telemetry field.
    expect(FORM_SOURCE).not.toMatch(/name="buyer_questions_joined"/);
    expect(FORM_SOURCE).not.toMatch(/name="buyer_questions_text"/);
  });

  it("initial render seeds exactly one question row", () => {
    expect(FORM_SOURCE).toMatch(
      /useState<\{ id: string \}\[\]>\(\(\) => \[\s*\{ id: nextQuestionId\(\) \},?\s*\]\)/,
    );
  });

  it("only the first row is required (aria-required / required=true on index === 0)", () => {
    expect(FORM_SOURCE).toMatch(/required=\{index === 0\}/);
    expect(FORM_SOURCE).toMatch(/aria-required=\{index === 0 \? "true" : undefined\}/);
  });

  it("add / remove controls are non-submitting buttons", () => {
    for (const cls of [
      "measurement-request__question-add",
      "measurement-request__question-remove",
    ]) {
      const rx = new RegExp(
        `type="button"[^]{0,200}?className="${cls}"|className="${cls}"[^]{0,200}?type="button"`,
      );
      expect(FORM_SOURCE, `${cls} must be type=button`).toMatch(rx);
    }
  });

  it("add / remove bounds enforced in state reducers", () => {
    // 1..MAX_QUESTIONS on add
    expect(FORM_SOURCE).toMatch(/prev\.length\s*>=\s*MAX_QUESTIONS/);
    // never below 1 on remove
    expect(FORM_SOURCE).toMatch(/prev\.length\s*<=\s*1/);
  });

  it("whitespace-only values are rejected before any provider request", () => {
    expect(FORM_SOURCE).toMatch(/\.value\.trim\(\)/);
    // rejection path : event.preventDefault + no fetch call for empty set
    expect(FORM_SOURCE).toMatch(/nonEmpty\.length === 0[\s\S]*?event\.preventDefault\(\)/);
  });

  it("native <form action|method> fallback preserves the governed Formspree contract", () => {
    expect(FORM_SOURCE).toMatch(/action=\{endpoint\}/);
    expect(FORM_SOURCE).toMatch(/method="POST"/);
  });

  it("FormData re-append uses repeated values (no join/concatenation)", () => {
    expect(FORM_SOURCE).toMatch(
      /data\.delete\("buyer_questions"\)[\s\S]*?data\.append\("buyer_questions",\s*q\)/,
    );
    expect(FORM_SOURCE).not.toMatch(/nonEmpty\.join\(/);
  });

  it("no buyer-question value is used in analytics attributes or URLs", () => {
    // The only data-cse-instrument-event in this form is the constant attempt name.
    const events = [...FORM_SOURCE.matchAll(/data-cse-instrument-event="([^"]+)"/g)].map(
      (m) => m[1],
    );
    for (const ev of events) {
      expect(ev).toMatch(/^[a-z_]+$/);
      expect(ev).not.toContain("question");
      expect(ev).not.toContain("buyer");
    }
    expect(FORM_SOURCE).not.toMatch(/searchParams[^)]*buyer_questions/);
    expect(FORM_SOURCE).not.toMatch(/console\.[a-z]+\([^)]*buyer_questions/);
  });

  it("truthful copy — no self-serve execution claims, manual-review contract retained", () => {
    for (const stale of [
      "Start measurement",
      "Run now",
      "Instant measurement",
      "Launches your measurement",
      "Schedule your measurement",
    ]) {
      expect(FORM_SOURCE).not.toContain(stale);
    }
    expect(FORM_SOURCE).toContain(
      "Requests are reviewed manually. No measurement starts on submission.",
    );
  });

  it("existing four original fields and their maxlengths remain unchanged", () => {
    const pairs: [string, number][] = [
      ["name", 100],
      ["email", 254],
      ["company_domain", 255],
      ["measurement_context", 2000],
    ];
    for (const [n, max] of pairs) {
      expect(FORM_SOURCE).toContain(`name="${n}"`);
      const rx = new RegExp(`name="${n}"[\\s\\S]{0,400}?maxLength=\\{${max}\\}`);
      expect(FORM_SOURCE, `maxLength=${max} on ${n}`).toMatch(rx);
    }
  });
});

// Les blocs « built HTML » (/request-measurement) et « /privacy » de PR #22 décrivaient la page de
// capture câblée en dur sur un endpoint et une identité fixes. Au portage, /request-measurement et
// /privacy restent ceux de main (gouvernés par conversionConfig : off / demo / live, mentions
// légales issues de la configuration) ; leurs invariants HTML vivent dans exported-html.test.ts,
// measurement-request.test.ts, landing-attribution.test.ts et privacy-footer.test.ts.

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
