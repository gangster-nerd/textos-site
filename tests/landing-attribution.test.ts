import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { buildCtaAttributionHref } from "@/lib/content-surface-engine/conversion/build-cta-attribution";
import { LANDING_ATTRIBUTION_FIELDS, parseLandingAttribution } from "@/lib/conversion/landing-attribution";

const href = buildCtaAttributionHref({
  destination: "/request-measurement",
  contentId: "textos-insight-graduated-publication",
  clusterId: "authority-measurement",
  ctaVariant: "measurement_request",
  ctaVersion: 2,
  position: "final",
  contentRevision: 3,
});
const search = href.slice(href.indexOf("?"));

describe("attribution d'arrivée sur /request-measurement", () => {
  test("aller-retour exact avec l'URL que les CTA d'article construisent", () => {
    expect(parseLandingAttribution(search)).toEqual({
      contentId: "textos-insight-graduated-publication",
      clusterId: "authority-measurement",
      ctaVariant: "measurement_request",
      ctaVersion: "2",
      position: "final",
      contentRevision: "3",
    });
  });

  test("clusterId est facultatif", () => {
    const params = new URLSearchParams(search);
    params.delete("clusterId");
    expect(parseLandingAttribution(params.toString())?.clusterId).toBeNull();
  });

  test("tout ou rien : une valeur hors contrat annule toute l'attribution", () => {
    const tamper = (key: string, value: string) => {
      const params = new URLSearchParams(search);
      params.set(key, value);
      return parseLandingAttribution(params.toString());
    };
    expect(tamper("source", "partner-site")).toBeNull();
    expect(tamper("ctaVariant", "trial")).toBeNull(); // variante non approuvée
    expect(tamper("ctaVariant", "unknown")).toBeNull();
    expect(tamper("contentId", "<script>")).toBeNull();
    expect(tamper("contentId", "alice@example.com")).toBeNull(); // jamais une donnée personnelle
    expect(tamper("position", "sidebar")).toBeNull();
    expect(tamper("ctaVersion", "2.0")).toBeNull();
    expect(tamper("contentRevision", "-1")).toBeNull();
    expect(parseLandingAttribution("")).toBeNull();
  });

  test("les clés hors liste blanche sont ignorées, jamais transmises", () => {
    const parsed = parseLandingAttribution(`${search}&utm_source=x&email=alice%40example.com`);
    expect(parsed).not.toBeNull();
    expect(Object.keys(parsed!)).toEqual(Object.keys(LANDING_ATTRIBUTION_FIELDS));
  });

  test("le formulaire lit l'attribution depuis l'URL seule, sans stockage ni réseau", () => {
    const src = readFileSync(path.resolve("components/conversion/MeasurementRequestForm.tsx"), "utf8");
    expect(src).toContain("parseLandingAttribution(window.location.search)");
    for (const name of Object.values(LANDING_ATTRIBUTION_FIELDS)) {
      expect(Object.values(LANDING_ATTRIBUTION_FIELDS)).toContain(name);
      expect(name).toMatch(/^source_[a-z_]+$/);
    }
    for (const forbidden of ["localStorage", "sessionStorage", "document.cookie", "fetch(", "XMLHttpRequest"]) {
      expect(src).not.toContain(forbidden);
    }
  });
});
