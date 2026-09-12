// Tests CTC-7 — clôture gouvernance : legacy resolver retiré, frontmatter strict,
// canonical binding COMPANY_TECHNOLOGY, editorialCandidates requis en bundle,
// self-serve nécessite surface commerciale, FAQ m5.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import {
  COMMIT_TO_CONTENT_CANONICAL_FRONTMATTER,
  EditorialFrontmatterSchema,
} from "@/lib/commit-to-content/editorial-frontmatter";
import {
  parseFrontmatterRaw,
  scanEditorialCandidates,
} from "@/lib/commit-to-content/editorial-registrar";
import {
  CANONICAL_AUTHORITATIVE_SURFACES,
  verifyEditorialCandidates,
} from "@/lib/commit-to-content/editorial-verifier";
import { selfServeCtaGate } from "@/lib/commit-to-content/publishability";
import type { ProductManifest } from "@/lib/product-manifest/manifest-schema";
import { loadPinnedManifest } from "@/lib/product-manifest/manifest-schema";

const SITE_ROOT = new URL("..", import.meta.url).pathname;
const pinnedManifest = loadPinnedManifest(SITE_ROOT);
const bundleDir = path.join(SITE_ROOT, "content-bundles/authoritative-a0efa14");
const readBundle = () => JSON.parse(readFileSync(path.join(bundleDir, "bundle.json"), "utf8"));

describe("CTC-7 — politique unique de truth-level", () => {
  it("sync.ts n'exporte plus le helper permissif truthLevelOfRef", async () => {
    const mod = await import("@/lib/commit-to-content/sync");
    expect((mod as unknown as Record<string, unknown>).truthLevelOfRef).toBeUndefined();
  });
});

describe("CTC-7 — schéma frontmatter strict", () => {
  const base = {
    surface: "faq",
    classification: "CONTENT_COVERAGE_GAP" as const,
    sourceProductRef: "a0efa146a8691938b624c156d99f4663f6f92218",
    truthLevel: "AUTHORITATIVE_MAIN" as const,
    basisCapabilities: ["direct-share-of-model"],
    basisClaimIds: ["m2-direct-share-of-model"],
    disclosureAuthority: "IMPLICIT_MANIFEST_MARKETABLE" as const,
    proposedPublishability: "REQUIRES_HUMAN_REVIEW" as const,
    language: "en" as const,
    humanReviewRequired: true,
  };

  it("frontmatter minimal valide → accepté", () => {
    expect(EditorialFrontmatterSchema.safeParse(base).success).toBe(true);
  });

  it("sourceProductRef manquant → rejeté", () => {
    const { sourceProductRef: _, ...bad } = base;
    expect(EditorialFrontmatterSchema.safeParse(bad).success).toBe(false);
  });

  it("basisCapabilities manquant → rejeté", () => {
    const { basisCapabilities: _, ...bad } = base;
    expect(EditorialFrontmatterSchema.safeParse(bad).success).toBe(false);
  });

  it("classification non-NO_CHANGE + bindings vides → rejeté", () => {
    const bad = { ...base, basisCapabilities: [], basisClaimIds: [] };
    expect(EditorialFrontmatterSchema.safeParse(bad).success).toBe(false);
  });

  it("classification=NO_CHANGE + bindings vides → toléré (aucune affirmation positive)", () => {
    const ok = { ...base, classification: "NO_CHANGE" as const, basisCapabilities: [], basisClaimIds: [] };
    expect(EditorialFrontmatterSchema.safeParse(ok).success).toBe(true);
  });

  it("champ inconnu → rejeté (strict)", () => {
    const bad = { ...base, mysteryField: "x" };
    expect(EditorialFrontmatterSchema.safeParse(bad).success).toBe(false);
  });
});

describe("CTC-7 — COMPANY_TECHNOLOGY exige tous les champs supplémentaires", () => {
  const ctBase = {
    surface: "labs",
    classification: "LABS_MATURITY_CHANGE" as const,
    sourceProductRef: "a".repeat(40),
    truthLevel: "AUTHORITATIVE_MAIN" as const,
    basisCapabilities: [],
    basisClaimIds: [],
    disclosureAuthority: "CPO_DISCLOSURE_APPROVED" as const,
    proposedPublishability: "REQUIRES_HUMAN_REVIEW" as const,
    language: "en" as const,
    humanReviewRequired: true,
    capabilityId: "commit-to-content",
    storyKind: "COMPANY_TECHNOLOGY" as const,
    publicMaturity: "INTERNAL_LABS" as const,
    disclosureDecisionRef: "docs/decisions/CPO-2026-09-12-commit-to-content-disclosure.md",
    cta: "none" as const,
    appliesToPublicRoute: false,
  };

  it("cta=contact → rejeté", () => {
    const bad = { ...ctBase, cta: "contact" as const };
    expect(EditorialFrontmatterSchema.safeParse(bad).success).toBe(false);
  });

  it("appliesToPublicRoute=true → rejeté", () => {
    const bad = { ...ctBase, appliesToPublicRoute: true };
    expect(EditorialFrontmatterSchema.safeParse(bad).success).toBe(false);
  });

  it("disclosureDecisionRef manquant → rejeté", () => {
    const { disclosureDecisionRef: _, ...bad } = ctBase;
    expect(EditorialFrontmatterSchema.safeParse(bad).success).toBe(false);
  });

  it("appliesToPublicRoute=false + cta=none + tous les champs → accepté", () => {
    expect(EditorialFrontmatterSchema.safeParse(ctBase).success).toBe(true);
  });
});

describe("CTC-7 — liaison canonique commit-to-content", () => {
  const editorialPath = path.join(bundleDir, "editorial/commit-to-content-technology-story.md");
  const original = readFileSync(editorialPath, "utf8");

  afterAll(() => {
    writeFileSync(editorialPath, original, "utf8");
  });

  const verify = () => {
    const bundle = readBundle();
    return verifyEditorialCandidates({
      bundleDir,
      editorialCandidates: bundle.editorialCandidates,
      selfServeEligible: false,
      siteRoot: SITE_ROOT,
      truthLevel: bundle.truthLevel,
      overallStatus: bundle.overallStatus,
    });
  };

  it("canonical frontmatter présent → verify green", () => {
    expect(verify()).toEqual([]);
  });

  it("mutation cta=contact → verify fails", () => {
    writeFileSync(editorialPath, original.replace("cta: none", "cta: contact"), "utf8");
    const failures = verify();
    // Le hash divergent OU la liaison canonique doit détecter l'anomalie.
    expect(failures.length).toBeGreaterThan(0);
    writeFileSync(editorialPath, original, "utf8");
  });

  it("mutation disclosureDecisionRef → verify fails", () => {
    writeFileSync(
      editorialPath,
      original.replace(
        "disclosureDecisionRef: docs/decisions/CPO-2026-09-12-commit-to-content-disclosure.md",
        "disclosureDecisionRef: docs/decisions/does-not-exist.md",
      ),
      "utf8",
    );
    const failures = verify();
    expect(failures.length).toBeGreaterThan(0);
    writeFileSync(editorialPath, original, "utf8");
  });

  it("canonical constant a les 7 champs attendus", () => {
    expect(Object.keys(COMMIT_TO_CONTENT_CANONICAL_FRONTMATTER).sort()).toEqual(
      [
        "appliesToPublicRoute",
        "cta",
        "disclosureAuthority",
        "disclosureDecisionRef",
        "proposedPublishability",
        "publicMaturity",
        "storyKind",
      ].sort(),
    );
  });
});

describe("CTC-7 — editorialCandidates requis dans bundle + surfaces canoniques complètes", () => {
  const verify = (bundleOverride?: Partial<Record<string, unknown>>) => {
    const bundle = { ...readBundle(), ...bundleOverride };
    return verifyEditorialCandidates({
      bundleDir,
      editorialCandidates: bundle.editorialCandidates,
      selfServeEligible: false,
      siteRoot: SITE_ROOT,
      truthLevel: bundle.truthLevel,
      overallStatus: bundle.overallStatus,
    });
  };

  it("les 4 surfaces canoniques ont une décision dans le bundle courant", () => {
    const bundle = readBundle();
    const surfaces = new Set(
      bundle.editorialCandidates.map((c: { surface: string }) => c.surface),
    );
    for (const s of CANONICAL_AUTHORITATIVE_SURFACES) {
      expect(surfaces.has(s), `manque décision surface ${s}`).toBe(true);
    }
  });

  it("bundle AUTHORITATIVE_MAIN sans décision `faq` → verify fails", () => {
    const bundle = readBundle();
    const filtered = bundle.editorialCandidates.filter(
      (c: { surface: string }) => c.surface !== "faq",
    );
    const failures = verify({ editorialCandidates: filtered });
    const missing = failures.find((f) => f.message.includes('surface canonique "faq"'));
    expect(missing).toBeDefined();
  });

  it("truthLevel=UNRECOGNIZED_SOURCE_REF + overallStatus=REQUIRES_HUMAN_REVIEW → verify fails", () => {
    const failures = verify({
      truthLevel: "UNRECOGNIZED_SOURCE_REF",
      overallStatus: "REQUIRES_HUMAN_REVIEW",
    });
    expect(failures.find((f) => f.message.includes("UNRECOGNIZED_SOURCE_REF"))).toBeDefined();
  });
});

describe("CTC-7 — self-serve exige surface commerciale", () => {
  function mfWith(entities: ProductManifest["entities"]): ProductManifest {
    return { ...pinnedManifest, entities };
  }

  it("les trois capacités public_marketable mais l'une restreinte à FAQ → eligible=false", () => {
    const marketable = (id: string, surfaces: readonly string[]) => ({
      id,
      kind: "capability" as const,
      implementationStatus: "implemented" as const,
      publicationStatus: "public_marketable" as const,
      allowedSurfaces: surfaces as ("homepage" | "faq" | "product_article" | "sales_copy" | "developer_note" | "changelog" | "pricing")[],
      publicationDecision: { decidedIn: "ADR-999", recordedAt: "2026-09-12" },
      evidence: [],
      prohibitedClaims: [],
      knownLimits: [],
    });
    const manifest = mfWith([
      ...pinnedManifest.entities,
      marketable("self-serve-onboarding", ["homepage"]),
      marketable("authenticated-product-entry", ["sales_copy"]),
      marketable("ui-measurement-launch", ["faq"]), // pas de surface commerciale
    ]);
    const gate = selfServeCtaGate({ manifest, activationProposed: false });
    expect(gate.eligible).toBe(false);
    expect(gate.missingCapabilities.some((m) => m.includes("ui-measurement-launch"))).toBe(true);
  });

  it("les trois avec surface commerciale (homepage/sales_copy) → eligible=true", () => {
    const marketable = (id: string) => ({
      id,
      kind: "capability" as const,
      implementationStatus: "implemented" as const,
      publicationStatus: "public_marketable" as const,
      allowedSurfaces: ["homepage", "sales_copy"] as ("homepage" | "sales_copy")[],
      publicationDecision: { decidedIn: "ADR-999", recordedAt: "2026-09-12" },
      evidence: [],
      prohibitedClaims: [],
      knownLimits: [],
    });
    const manifest = mfWith([
      ...pinnedManifest.entities,
      marketable("self-serve-onboarding"),
      marketable("authenticated-product-entry"),
      marketable("ui-measurement-launch"),
    ]);
    const gate = selfServeCtaGate({ manifest, activationProposed: false });
    expect(gate.eligible).toBe(true);
  });
});

describe("CTC-7 — FAQ Quality Ledger bindé sur m5 et m6", () => {
  const faq = readFileSync(
    path.join(SITE_ROOT, "content-bundles/authoritative-a0efa14/editorial/faq.md"),
    "utf8",
  );
  it("frontmatter basisClaimIds inclut m5-not-observable-is-not-zero", () => {
    const front = parseFrontmatterRaw(faq);
    expect(front.basisClaimIds).toContain("m5-not-observable-is-not-zero");
  });
  it("frontmatter basisClaimIds inclut m6-quality-ledger-contextualises", () => {
    const front = parseFrontmatterRaw(faq);
    expect(front.basisClaimIds).toContain("m6-quality-ledger-contextualises");
  });
  it("wording m5 + m6 (contextualisation, non-observation ≠ zéro)", () => {
    expect(faq).toContain("contextualise");
    expect(faq).toContain("not combined into the measured result");
    expect(faq).toContain("never recorded as a measured zero");
  });
});

describe("CTC-7 — parseFrontmatterRaw supporte les listes inline `[]`", () => {
  it("empty inline list → []", () => {
    const out = parseFrontmatterRaw("---\nfoo: []\n---\nbody");
    expect(out.foo).toEqual([]);
  });
  it("short-form list → tableau", () => {
    const out = parseFrontmatterRaw("---\nfoo: [a, b, c]\n---\nbody");
    expect(out.foo).toEqual(["a", "b", "c"]);
  });
});

describe("CTC-7 — scanEditorialCandidates rejette frontmatter malformé", () => {
  it("le scan du bundle courant ne renvoie aucune failure", () => {
    const { failures } = scanEditorialCandidates({ bundleDir });
    expect(failures).toEqual([]);
  });
});
