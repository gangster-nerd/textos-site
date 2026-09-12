// Tests des invariants de maturité CPO.

import { describe, expect, it } from "vitest";

import {
  MATURITY_COPY_CONTRACT,
  manifestCeiling,
  reconcileMaturity,
} from "@/lib/commit-to-content/maturity";
import { MATURITY_DECLARATIONS } from "@/lib/commit-to-content/maturity-declarations";
import { maturityGate } from "@/lib/commit-to-content/publishability";
import { detectOpportunities } from "@/lib/commit-to-content/opportunities";
import { computeCapabilityDelta } from "@/lib/commit-to-content/compute-delta";
import { loadPinnedManifest } from "@/lib/product-manifest/manifest-schema";
import type { ProductSourceRef } from "@/lib/commit-to-content/types";

const SITE_ROOT = new URL("..", import.meta.url).pathname;

function refWith(overrides: Partial<ProductSourceRef> = {}): ProductSourceRef {
  return {
    sha: "a".repeat(40),
    shortSha: "aaaaaaa",
    truthLevel: "AUTHORITATIVE_MAIN",
    declarationDigest: "digest",
    matchesPinnedManifest: true,
    ...overrides,
  };
}

describe("maturity taxonomy — invariants CPO", () => {
  const pinnedManifest = loadPinnedManifest(SITE_ROOT);

  it("le contrat de copy PUBLIC_BETA interdit exactement les termes GA-ish", () => {
    const contract = MATURITY_COPY_CONTRACT.PUBLIC_BETA;
    expect(contract.mustNotImply).toContain("self-service activation");
    expect(contract.mustNotImply).toContain("GA-level reliability");
    expect(contract.mustNotImply).toContain("one-click integration");
    expect(contract.mustNotImply).toContain("universal compatibility");
    expect(contract.mustNotImply).toContain("production-scale SLA");
  });

  it("PUBLIC_BETA n'autorise PAS le CTA measurement_request auto-service", () => {
    const contract = MATURITY_COPY_CONTRACT.PUBLIC_BETA;
    expect(contract.ctaAllowed).toContain("contact");
    expect(contract.ctaAllowed).toContain("labs_signup");
    expect(contract.ctaAllowed).not.toContain("measurement_request");
  });

  it("INTERNAL_LABS n'autorise AUCUN CTA de vente (ni measurement_request, ni contact)", () => {
    const contract = MATURITY_COPY_CONTRACT.INTERNAL_LABS;
    expect(contract.ctaAllowed).toEqual(["none"]);
  });

  it("manifestCeiling(internal_only) plafonne à INTERNAL_LABS", () => {
    // truth-check est internal_only dans le manifeste épinglé.
    const ceiling = manifestCeiling(pinnedManifest, "truth-check");
    expect(ceiling).toBe("INTERNAL_LABS");
  });

  it("reconcileMaturity clamp une proposition PUBLIC_BETA sous plafond INTERNAL_LABS", () => {
    const r = reconcileMaturity({ proposed: "PUBLIC_BETA", ceiling: "INTERNAL_LABS" });
    expect(r.effective).toBe("INTERNAL_LABS");
    expect(r.wasClamped).toBe(true);
  });

  it("reconcileMaturity respecte une proposition INTERNAL_LABS sous plafond PUBLIC_GA", () => {
    const r = reconcileMaturity({ proposed: "INTERNAL_LABS", ceiling: "PUBLIC_GA" });
    expect(r.effective).toBe("INTERNAL_LABS");
    expect(r.wasClamped).toBe(false);
  });

  it("FORBIDDEN écrase toute proposition", () => {
    const r = reconcileMaturity({ proposed: "PUBLIC_GA", ceiling: "FORBIDDEN" });
    expect(r.effective).toBe("FORBIDDEN");
  });

  it("gate maturityGate reste vert sur le roster actuel", () => {
    expect(maturityGate(pinnedManifest).status).toBe("green");
  });

  it("toutes les déclarations INTERNAL_LABS ont CTA=none (jamais measurement_request ni labs_signup)", () => {
    for (const d of MATURITY_DECLARATIONS) {
      if (d.proposedMaturity === "INTERNAL_LABS") {
        expect(d.cta).toBe("none");
      }
    }
  });

  it("commit-to-content est déclaré INTERNAL_LABS (règle CPO)", () => {
    const d = MATURITY_DECLARATIONS.find((x) => x.capabilityId === "commit-to-content");
    expect(d).toBeDefined();
    expect(d!.proposedMaturity).toBe("INTERNAL_LABS");
    expect(d!.cta).toBe("none");
  });

  it("Zendesk / Yext ne sont PAS déclarés (audit produit : NOT_FOUND)", () => {
    // Ne JAMAIS ajouter de déclaration éditoriale sans preuve d'implémentation.
    for (const forbidden of ["zendesk", "yext"]) {
      const found = MATURITY_DECLARATIONS.find((d) =>
        d.capabilityId.toLowerCase().includes(forbidden),
      );
      expect(found, `${forbidden} ne doit pas être déclaré — aucune preuve produit`).toBeUndefined();
    }
  });

  it("detectOpportunities émet une entrée par déclaration éditoriale + un signal CAPABILITY_DELTA quand ∅", () => {
    const targetRef = refWith({});
    const delta = computeCapabilityDelta({ pinnedManifest, targetRef });
    const opps = detectOpportunities({ pinnedManifest, targetRef, delta });
    // Au minimum : 1 signal CAPABILITY_DELTA + une opportunité par déclaration.
    expect(opps.length).toBeGreaterThanOrEqual(1 + MATURITY_DECLARATIONS.length);
    const kinds = new Set(opps.map((o) => o.kind));
    expect(kinds.has("CAPABILITY_DELTA")).toBe(true);
    expect(kinds.has("LABS_MATURITY_CHANGE")).toBe(true);
  });

  it("wordpress-publication est proposé PUBLIC_BETA mais CLAMPED faute d'entrée manifeste", () => {
    const targetRef = refWith({});
    const delta = computeCapabilityDelta({ pinnedManifest, targetRef });
    const opps = detectOpportunities({ pinnedManifest, targetRef, delta });
    const wp = opps.find((o) => o.capabilityId === "wordpress-publication");
    expect(wp).toBeDefined();
    // Pas d'entrée `wordpress-publication` dans le manifeste épinglé → ceiling PRIVATE →
    // clamp à PRIVATE. C'est INTENTIONNEL : le CPO doit d'abord obtenir une décision produit
    // pour que WordPress soit BETA-communiqué.
    expect(wp!.wasClamped).toBe(true);
  });
});
