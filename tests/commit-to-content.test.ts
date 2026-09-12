// Tests des invariants durs de commit-to-content V1.

import { describe, expect, it } from "vitest";

import { decidePublishability, selfServeCtaGate } from "@/lib/commit-to-content/publishability";
import { computeCapabilityDelta } from "@/lib/commit-to-content/compute-delta";
import { loadPinnedManifest } from "@/lib/product-manifest/manifest-schema";
import type { ProductSourceRef } from "@/lib/commit-to-content/types";

const SITE_ROOT = new URL("..", import.meta.url).pathname;

function refWith(overrides: Partial<ProductSourceRef>): ProductSourceRef {
  return {
    sha: "a".repeat(40),
    shortSha: "aaaaaaa",
    truthLevel: "AUTHORITATIVE_MAIN",
    declarationDigest: "digest",
    matchesPinnedManifest: true,
    ...overrides,
  };
}

describe("commit-to-content publishability invariants", () => {
  const pinnedManifest = loadPinnedManifest(SITE_ROOT);

  it("invariant 1 : truthLevel=CANDIDATE ne peut pas devenir PUBLIC_SAFE", () => {
    const targetRef = refWith({ truthLevel: "CANDIDATE" });
    const delta = computeCapabilityDelta({ pinnedManifest, targetRef });
    const decision = decidePublishability({ targetRef, delta, pinnedManifest });
    expect(decision.overallStatus).toBe("WAITING_FOR_PRODUCT_MAIN");
    expect(decision.overallStatus).not.toBe("PUBLIC_SAFE");
    for (const s of decision.surfaces) {
      expect(s.status).toBe("WAITING_FOR_PRODUCT_MAIN");
    }
  });

  it("invariant 2 : declarationDiverged=true impose BLOCKED", () => {
    const targetRef = refWith({ matchesPinnedManifest: false });
    const delta = computeCapabilityDelta({ pinnedManifest, targetRef });
    expect(delta.declarationDiverged).toBe(true);
    const decision = decidePublishability({ targetRef, delta, pinnedManifest });
    expect(decision.overallStatus).toBe("BLOCKED");
    expect(decision.gates.declarationIntegrity.status).toBe("red");
    expect(decision.gates.manifestDrift.status).toBe("red");
  });

  it("invariant 3 : AUTHORITATIVE_MAIN sans delta ⇒ REQUIRES_HUMAN_REVIEW (jamais PUBLIC_SAFE auto)", () => {
    const targetRef = refWith({ truthLevel: "AUTHORITATIVE_MAIN", matchesPinnedManifest: true });
    const delta = computeCapabilityDelta({ pinnedManifest, targetRef });
    const decision = decidePublishability({ targetRef, delta, pinnedManifest });
    expect(decision.overallStatus).toBe("REQUIRES_HUMAN_REVIEW");
    expect(decision.overallStatus).not.toBe("PUBLIC_SAFE");
  });

  it("invariant 4 : capacités self-serve internal_only ⇒ pas d'activation CTA publique proposée", () => {
    const gate = selfServeCtaGate(pinnedManifest);
    // Le gate reste vert (aucune infraction observée), mais son détail énumère les capacités
    // internal_only à ne PAS activer publiquement. La formule doit citer au moins une capacité
    // interne connue.
    expect(gate.status).toBe("green");
    // CTC-6 : le gate ne parle plus d'internal_only ; il évalue explicitement l'éligibilité
    // via les trois capacités requises (self-serve-onboarding, authenticated-product-entry,
    // ui-measurement-launch). En l'absence d'activation proposée, il reste GREEN mais
    // eligible=false.
    expect(gate.eligible).toBe(false);
    expect(gate.activationProposed).toBe(false);
  });

  it("determinisme : deux appels successifs à decidePublishability sur les mêmes entrées produisent la même décision", () => {
    const targetRef = refWith({});
    const delta = computeCapabilityDelta({ pinnedManifest, targetRef });
    const a = decidePublishability({ targetRef, delta, pinnedManifest });
    const b = decidePublishability({ targetRef, delta, pinnedManifest });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("aucun bundle CANDIDATE émis dans le dépôt n'a overallStatus=PUBLIC_SAFE", async () => {
    // Balayage disque des bundles présents. Si aucun bundle n'est présent (dépôt frais), le test
    // est nul, ce qui est acceptable.
    const { readdirSync, readFileSync, existsSync } = await import("node:fs");
    const path = await import("node:path");
    const dir = path.join(SITE_ROOT, "content-bundles");
    // CTC-6 : le dossier DOIT exister. Un test acceptance vacuous cacherait un manque de bundles.
    expect(existsSync(dir)).toBe(true);
    const bundleNames = readdirSync(dir).filter((n) =>
      existsSync(path.join(dir, n, "bundle.json")),
    );
    expect(bundleNames.length).toBeGreaterThan(0);
    for (const name of bundleNames) {
      const file = path.join(dir, name, "bundle.json");
      const bundle = JSON.parse(readFileSync(file, "utf8"));
      if (bundle.truthLevel === "CANDIDATE") {
        expect(bundle.overallStatus).not.toBe("PUBLIC_SAFE");
      }
    }
  });
});
