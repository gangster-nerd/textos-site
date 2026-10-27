// MEASUREMENT-REQUEST-CAPTURE-1 — focused invariants for the governed
// measurement-request capture surface. No live provider POST is executed.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  isValidFormspreeEndpoint,
  resolveMeasurementRequestCapability,
  measurementRequestCapability,
} from "@/lib/config/measurement-request-config";
import { deriveResolvedConversionPlan } from "@/lib/content-surface-engine/site-integration/conversion-plan";

const OUT_DIR = path.resolve("out");
const hasBuild = fs.existsSync(path.join(OUT_DIR, "request-measurement.html"));
const FORM_SOURCE = fs.readFileSync(
  path.resolve("components/conversion/MeasurementRequestCaptureForm.tsx"),
  "utf8",
);

describe("MEASUREMENT-REQUEST-CAPTURE-1 — capability resolution", () => {
  it("valid Formspree endpoint resolves configured", () => {
    const cap = resolveMeasurementRequestCapability("https://formspree.io/f/meaoonqy");
    expect(cap.state).toBe("configured");
    expect(cap.endpoint).toBe("https://formspree.io/f/meaoonqy");
    expect(cap.controllerName).toBe("Marc Prp - TextOS");
    expect(cap.privacyContactEmail).toBe("marcprp@gmail.com");
    expect(cap.privacyUrl).toBe("/privacy");
  });

  it("malformed / missing endpoints resolve unconfigured", () => {
    const cases = [
      "",
      "not-a-url",
      "http://formspree.io/f/xyz",       // http, not https
      "https://formspree.io/xyz",        // missing /f/
      "https://formspree.io/f/",         // empty id
      "https://formspreeXio/f/xyz",      // wrong host
      "https://evil.example.com/f/xyz",  // wrong host
      "https://formspree.io/foo/bar",    // wrong prefix
    ];
    for (const raw of cases) {
      expect(isValidFormspreeEndpoint(raw), `expected invalid: ${raw}`).toBe(false);
      const cap = resolveMeasurementRequestCapability(raw);
      expect(cap.state, `unconfigured for ${raw}`).toBe("unconfigured");
      expect(cap.endpoint).toBe("");
    }
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

describe.skipIf(!hasBuild)("MEASUREMENT-REQUEST-CAPTURE-1 — built HTML", () => {
  const html = fs.readFileSync(path.join(OUT_DIR, "request-measurement.html"), "utf8");

  it("renders the four governed fields", () => {
    expect(html).toMatch(/name="name"/);
    expect(html).toMatch(/name="email"/);
    expect(html).toMatch(/name="company_domain"/);
    expect(html).toMatch(/name="measurement_context"/);
  });

  it("renders exactly one buyer_questions control on initial load, required and length-capped", () => {
    const inputs = [...html.matchAll(/<input[^>]*name="buyer_questions"[^>]*>/gi)];
    expect(inputs.length).toBe(1);
    const tag = inputs[0][0].toLowerCase();
    expect(tag).toMatch(/required(=""|=")/);
    expect(tag).toMatch(/maxlength="300"/);
  });

  it("questions fieldset is present with the buyer-question semantic hook", () => {
    expect(html).toMatch(/data-role="measurement-request-questions"/);
    expect(html).toContain("What questions do your buyers ask?");
    expect(html).toContain(
      "Do not include confidential, personal or sensitive information.",
    );
  });

  it("email and company_domain are required", () => {
    for (const n of ["email", "company_domain"]) {
      const m = html.match(new RegExp(`<input[^>]*name="${n}"[^>]*/?>`, "i"));
      expect(m, `input for ${n}`).not.toBeNull();
      expect(m![0]).toMatch(/required(=""|=")/);
    }
  });

  it("maxlengths match the provider contract", () => {
    // DOM attribute order isn't guaranteed by React; validate by inspecting
    // the tag that carries each `name=` attribute, in either order.
    function tagOf(name: string): string {
      const m = html.match(new RegExp(`<(input|textarea)[^>]*name="${name}"[^>]*/?>`, "i"));
      return m ? m[0] : "";
    }
    const cases: [string, number][] = [
      ["name", 100],
      ["email", 254],
      ["company_domain", 255],
      ["measurement_context", 2000],
    ];
    for (const [n, max] of cases) {
      const tag = tagOf(n);
      expect(tag, `tag for ${n}`).not.toBe("");
      expect(tag.toLowerCase(), `maxlength=${max} on ${n}`).toMatch(
        new RegExp(`maxlength="${max}"`),
      );
    }
  });

  it("form action and POST method match the governed endpoint", () => {
    expect(html).toMatch(/action="https:\/\/formspree\.io\/f\/meaoonqy"/);
    expect(html).toMatch(/method="POST"|method="post"/);
  });

  it("submit label uses request semantics (no instant-delivery promise)", () => {
    expect(html).toContain("Send measurement request");
    for (const stale of ["instant", "immediately", "self-serve measurement", "run now", "Start measurement"]) {
      expect(html).not.toContain(stale);
    }
  });

  it("privacy notice and /privacy link exist on the page", () => {
    expect(html).toMatch(/data-role="measurement-request-privacy"/);
    expect(html).toMatch(/href="\/privacy"/);
    expect(html).toContain("Marc Prp - TextOS");
    expect(html).toContain("marcprp@gmail.com");
  });

  it("no newsletter consent is implied", () => {
    expect(html).toContain("does not subscribe you to marketing or the newsletter");
  });

  it("no PII appears in instrumentation attributes", () => {
    for (const m of html.matchAll(/data-cse-instrument-event="([^"]+)"/g)) {
      expect(m[1]).toMatch(/^[a-z_]+$/);
      expect(m[1]).not.toContain("@");
    }
  });

  it("robots noindex/nofollow", () => {
    expect(html).toMatch(/<meta name="robots" content="noindex[,\s]*nofollow"/i);
  });

  it("CAPTURE-1A visual contract : exactly 4 stacked field groups + 1 submit + 1 privacy link + no unconfigured warning", () => {
    const fieldGroups = (html.match(/data-role="measurement-request-field"/g) ?? []).length;
    expect(fieldGroups, "field group hooks").toBe(4);
    const submits = (html.match(/data-role="measurement-request-submit"/g) ?? []).length;
    expect(submits, "single submit control").toBe(1);
    const privacyLinks = (html.match(/href="\/privacy"/g) ?? []).length;
    expect(privacyLinks, "single /privacy link").toBe(1);
    const configuredForms = (html.match(/data-provider-state="configured"/g) ?? []).length;
    expect(configuredForms, "exactly one configured Formspree form").toBe(1);
    expect(html).not.toContain('data-state="unavailable"');
    expect(html).not.toContain('data-provider-state="unconfigured"');
  });

  it("CAPTURE-1A visual contract : governed layout hooks exist and are token-scoped (no hard-coded light surface, no positional CSS)", () => {
    // Each field must own its independent label-row + control.
    for (const name of ["name", "email", "company_domain", "measurement_context"]) {
      const tag = html.match(new RegExp(`<(input|textarea)[^>]*name="${name}"[^>]*>`, "i"));
      expect(tag, `control for ${name}`).not.toBeNull();
      expect(tag![0], `control ${name} uses governed class`).toContain(
        "measurement-request__control",
      );
    }
    // Label rows are structural, not inline-with-controls.
    const labelRows = (html.match(/class="measurement-request__label-row"/g) ?? []).length;
    expect(labelRows).toBe(4);
    // Submit uses the site's governed primary CTA style + measurement submit class.
    expect(html).toMatch(
      /class="cse-surface__cta-primary measurement-request__submit"/,
    );
  });
});

describe.skipIf(!hasBuild)("MEASUREMENT-REQUEST-CAPTURE-1 — /privacy page", () => {
  const privacyPath = path.join(OUT_DIR, "privacy.html");
  it("exists and mentions Formspree + controller", () => {
    expect(fs.existsSync(privacyPath)).toBe(true);
    const html = fs.readFileSync(privacyPath, "utf8");
    expect(html).toContain("Marc Prp - TextOS");
    expect(html).toContain("marcprp@gmail.com");
    expect(html).toContain("Formspree");
    expect(html).toContain("does not subscribe you");
  });
});

describe.skipIf(!hasBuild)("MEASUREMENT-REQUEST-CAPTURE-1 — configured cohort", () => {
  const OUT_INSIGHTS = path.resolve("out/insights");
  const files = fs
    .readdirSync(OUT_INSIGHTS)
    .filter((f) => f.endsWith(".html") && !f.startsWith("__"))
    .sort();

  it("all 9 MEASURE_BRAND articles resolve an actionable /request-measurement destination", () => {
    if (measurementRequestCapability.state !== "configured") {
      // Test-time capability is configured because raw endpoint is baked in.
      throw new Error("capability unexpectedly unconfigured at test time");
    }
    let hits = 0;
    for (const f of files) {
      const html = fs.readFileSync(path.join(OUT_INSIGHTS, f), "utf8");
      if (
        html.includes('href="/request-measurement"') &&
        html.includes("Request your first measurement")
      ) {
        hits += 1;
      }
    }
    expect(hits).toBeGreaterThanOrEqual(9);
  });

  it("all 12 articles remain noindex/nofollow", () => {
    expect(files.length).toBe(12);
    for (const f of files) {
      const html = fs.readFileSync(path.join(OUT_INSIGHTS, f), "utf8");
      expect(html).toMatch(/<meta name="robots" content="noindex[,\s]*nofollow"/i);
    }
  });
});
