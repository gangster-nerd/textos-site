// Tests CTC-5 — troisième axe (autorité de divulgation), storyKind, promotion requests,
// éditoriaux préservés, self-serve fail-closed.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

// Précondition environnementale — les tests qui appellent réellement git sur le dépôt
// produit sont skipped en CI où TEXTOS_PRODUCT_REPO n'est pas monté. Les bundles committés
// couvrent la vérification en CI.
const productRepoPath =
  process.env.TEXTOS_PRODUCT_REPO && process.env.TEXTOS_PRODUCT_REPO.length > 0
    ? process.env.TEXTOS_PRODUCT_REPO
    : "/Users/marc/Desktop/textos";
const PRODUCT_REPO_AVAILABLE = existsSync(path.join(productRepoPath, ".git"));

import {
  MATURITY_DECLARATIONS,
  MaturityDeclarationSchema,
} from "@/lib/commit-to-content/maturity-declarations";
import {
  clampToCompanyTechnology,
  effectiveMaturityWithAuthority,
  manifestCeiling,
} from "@/lib/commit-to-content/maturity";
import { selfServeCtaGate } from "@/lib/commit-to-content/publishability";
import { buildPromotionRequests } from "@/lib/commit-to-content/promotion-requests";
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

const pinnedManifest = loadPinnedManifest(SITE_ROOT);

describe("CTC-5 — internal_only n'est pas une autorité de divulgation", () => {
  it("un manifeste internal_only ne rend PAS une déclaration PRODUCT_CAPABILITY publiable en l'absence d'autorité CPO", () => {
    // opportunity-brief est internal_only dans le manifeste épinglé.
    const decl = MATURITY_DECLARATIONS.find((d) => d.capabilityId === "opportunity-brief")!;
    expect(decl.disclosureAuthority).toBe("NONE");
    const ceiling = manifestCeiling(pinnedManifest, decl.capabilityId);
    const { effective } = effectiveMaturityWithAuthority({
      proposed: decl.proposedMaturity,
      ceiling,
      authority: decl.disclosureAuthority,
      storyKind: decl.storyKind,
    });
    expect(effective).toBe("PRIVATE");
  });

  it("une entrée absente du manifeste reste PRIVATE quel que soit la proposition", () => {
    const proposed = "PUBLIC_BETA" as const;
    const ceiling = manifestCeiling(pinnedManifest, "does-not-exist");
    expect(ceiling).toBe("PRIVATE");
    const { effective } = effectiveMaturityWithAuthority({
      proposed,
      ceiling,
      authority: "NONE",
      storyKind: "PRODUCT_CAPABILITY",
    });
    expect(effective).toBe("PRIVATE");
  });
});

describe("CTC-5 — la maturité ne confère aucune autorité de publication", () => {
  it("PUBLIC_GA proposé sans autorité manifeste et sans CPO → PRIVATE", () => {
    const { effective } = effectiveMaturityWithAuthority({
      proposed: "PUBLIC_GA",
      ceiling: "PRIVATE",
      authority: "NONE",
      storyKind: "PRODUCT_CAPABILITY",
    });
    expect(effective).toBe("PRIVATE");
  });
});

describe("CTC-5 — PRODUCT_CAPABILITY ne peut pas bypasser le plafond manifeste", () => {
  it("PRODUCT_CAPABILITY + CPO_DISCLOSURE_APPROVED sans autorité manifeste reste plafonné", () => {
    const { effective } = effectiveMaturityWithAuthority({
      proposed: "PUBLIC_BETA",
      ceiling: "INTERNAL_LABS",
      authority: "CPO_DISCLOSURE_APPROVED",
      storyKind: "PRODUCT_CAPABILITY",
    });
    // CPO ne peut pas relever le plafond manifeste pour une capacité produit — seul le
    // manifeste lui-même le peut. Le reconcile normal s'applique.
    expect(effective).toBe("INTERNAL_LABS");
  });
});

describe("CTC-5 — COMPANY_TECHNOLOGY est plafonnée à INTERNAL_LABS", () => {
  it("clampToCompanyTechnology réduit PUBLIC_GA/BETA/EARLY_ACCESS/ROADMAP à INTERNAL_LABS", () => {
    expect(clampToCompanyTechnology("PUBLIC_GA")).toBe("INTERNAL_LABS");
    expect(clampToCompanyTechnology("PUBLIC_BETA")).toBe("INTERNAL_LABS");
    expect(clampToCompanyTechnology("PUBLIC_EARLY_ACCESS")).toBe("INTERNAL_LABS");
    expect(clampToCompanyTechnology("PUBLIC_ROADMAP")).toBe("INTERNAL_LABS");
    expect(clampToCompanyTechnology("INTERNAL_LABS")).toBe("INTERNAL_LABS");
    expect(clampToCompanyTechnology("PRIVATE")).toBe("PRIVATE");
    expect(clampToCompanyTechnology("FORBIDDEN")).toBe("FORBIDDEN");
  });

  it("le schéma REJETTE une COMPANY_TECHNOLOGY avec maturité commerciale", () => {
    for (const m of ["PUBLIC_GA", "PUBLIC_BETA", "PUBLIC_EARLY_ACCESS", "PUBLIC_ROADMAP"] as const) {
      const res = MaturityDeclarationSchema.safeParse({
        capabilityId: "test-cap",
        storyKind: "COMPANY_TECHNOLOGY",
        disclosureAuthority: "CPO_DISCLOSURE_APPROVED",
        disclosureDecisionRef: "docs/decisions/CPO-2026-09-12-commit-to-content-disclosure.md",
        proposedMaturity: m,
        label: "test",
        surface: "labs",
        evidenceRefs: ["path"],
        publicWording: "test wording",
        prohibitedWording: [],
        cta: "none",
        rationale: "test",
        customerDeliverableNow: false,
        manualEngineeringRequired: false,
      });
      expect(res.success, `${m} should be rejected for COMPANY_TECHNOLOGY`).toBe(false);
    }
  });

  it("le schéma REJETTE une COMPANY_TECHNOLOGY avec CTA autre que none", () => {
    for (const cta of ["measurement_request", "contact", "labs_signup"] as const) {
      const res = MaturityDeclarationSchema.safeParse({
        capabilityId: "test-cap",
        storyKind: "COMPANY_TECHNOLOGY",
        disclosureAuthority: "CPO_DISCLOSURE_APPROVED",
        disclosureDecisionRef: "docs/decisions/CPO-2026-09-12-commit-to-content-disclosure.md",
        proposedMaturity: "INTERNAL_LABS",
        label: "test",
        surface: "labs",
        evidenceRefs: ["path"],
        publicWording: "test",
        prohibitedWording: [],
        cta,
        rationale: "test",
        customerDeliverableNow: false,
        manualEngineeringRequired: false,
      });
      expect(res.success, `cta=${cta} should be rejected for COMPANY_TECHNOLOGY`).toBe(false);
    }
  });

  it("COMPANY_TECHNOLOGY + INTERNAL_LABS + CPO_DISCLOSURE_APPROVED + CTA=none est VALIDE", () => {
    const res = MaturityDeclarationSchema.safeParse({
      capabilityId: "test-cap",
      storyKind: "COMPANY_TECHNOLOGY",
      disclosureAuthority: "CPO_DISCLOSURE_APPROVED",
      disclosureDecisionRef: "docs/decisions/CPO-2026-09-12-commit-to-content-disclosure.md",
      proposedMaturity: "INTERNAL_LABS",
      label: "Test story",
      surface: "labs",
      evidenceRefs: ["some/path"],
      publicWording: "Internal tooling narrative.",
      prohibitedWording: ["available"],
      cta: "none",
      rationale: "test",
      customerDeliverableNow: false,
      manualEngineeringRequired: false,
    });
    expect(res.success).toBe(true);
  });

  it("COMPANY_TECHNOLOGY avec disclosureAuthority=NONE → effective PRIVATE", () => {
    const { effective } = effectiveMaturityWithAuthority({
      proposed: "INTERNAL_LABS",
      ceiling: "PRIVATE",
      authority: "NONE",
      storyKind: "COMPANY_TECHNOLOGY",
    });
    expect(effective).toBe("PRIVATE");
  });
});

describe("CTC-5 — décision CPO durable", () => {
  it("le fichier de décision existe au chemin déclaré", () => {
    const abs = path.join(
      SITE_ROOT,
      "docs/decisions/CPO-2026-09-12-commit-to-content-disclosure.md",
    );
    expect(existsSync(abs)).toBe(true);
    const body = readFileSync(abs, "utf8");
    expect(body).toContain("2026-09-12");
    expect(body).toContain("COMPANY_TECHNOLOGY");
    expect(body).toContain("INTERNAL_LABS");
  });

  it("le schéma REJETTE une déclaration CPO avec disclosureDecisionRef pointant sur un fichier inexistant", () => {
    const res = MaturityDeclarationSchema.safeParse({
      capabilityId: "ghost",
      storyKind: "COMPANY_TECHNOLOGY",
      disclosureAuthority: "CPO_DISCLOSURE_APPROVED",
      disclosureDecisionRef: "docs/decisions/does-not-exist.md",
      proposedMaturity: "INTERNAL_LABS",
      label: "ghost",
      surface: "labs",
      evidenceRefs: ["p"],
      publicWording: "wording",
      prohibitedWording: [],
      cta: "none",
      rationale: "r",
      customerDeliverableNow: false,
      manualEngineeringRequired: false,
    });
    expect(res.success).toBe(false);
  });
});

describe("CTC-5 — commit-to-content n'est pas une capacité TextOS", () => {
  it("est déclaré COMPANY_TECHNOLOGY / INTERNAL_LABS / CTA=none", () => {
    const d = MATURITY_DECLARATIONS.find((x) => x.capabilityId === "commit-to-content")!;
    expect(d.storyKind).toBe("COMPANY_TECHNOLOGY");
    expect(d.proposedMaturity).toBe("INTERNAL_LABS");
    expect(d.cta).toBe("none");
    expect(d.disclosureAuthority).toBe("CPO_DISCLOSURE_APPROVED");
    expect(d.disclosureDecisionRef).toBe(
      "docs/decisions/CPO-2026-09-12-commit-to-content-disclosure.md",
    );
  });

  it("l'homepage éditoriale ne mentionne PAS Commit to Content", () => {
    const abs = path.join(SITE_ROOT, "content-bundles/authoritative-a0efa14/editorial/homepage.md");
    // CTC-6 : plus de fallback vacuous. Le fichier DOIT exister.
    expect(existsSync(abs), `homepage editorial absent : ${abs}`).toBe(true);
    const body = readFileSync(abs, "utf8").toLowerCase();
    const copyBody = body.split(/\n---\n/)[2] ?? body;
    expect(copyBody).not.toContain("commit to content");
  });

  it("aucune route /labs publique n'existe dans app/", () => {
    const labsRoute = path.join(SITE_ROOT, "app/labs");
    expect(existsSync(labsRoute)).toBe(false);
  });
});

describe("CTC-5 — self-serve fail-closed", () => {
  it("truth-check, grounded-truth-check et structured-generation restent internal_only", () => {
    for (const id of ["truth-check", "grounded-truth-check", "structured-generation"]) {
      const entity = pinnedManifest.entities.find((e) => e.id === id);
      // grounded-truth-check et structured-generation ne sont pas dans le manifeste (Gutenberg
      // additions R2 non intégrées) — l'absence = PRIVATE aussi.
      if (entity) {
        expect(entity.publicationStatus, `${id} doit rester internal_only`).toBe("internal_only");
      }
    }
  });

  it("selfServeCtaGate reste vert sur manifeste actuel (aucune activation publique proposée)", () => {
    expect(selfServeCtaGate(pinnedManifest).status).toBe("green");
  });

  it("aucune déclaration de maturité ne propose un CTA measurement_request pour ces capacités", () => {
    for (const id of ["truth-check", "grounded-truth-check", "structured-generation"]) {
      const decl = MATURITY_DECLARATIONS.find((d) => d.capabilityId === id);
      if (decl) {
        expect(decl.cta).not.toBe("measurement_request");
      }
    }
  });
});

describe.skipIf(!PRODUCT_REPO_AVAILABLE)("CTC-5 — promotion requests déterministes et complets", () => {
  const targetRef = refWith({ sha: "a0efa146a8691938b624c156d99f4663f6f92218", shortSha: "a0efa14" });
  // Lazy — évite l'exécution git au IMPORT du fichier de test.
  const build = () => buildPromotionRequests({ pinnedManifest, targetRef });

  it("émet une entrée par déclaration éditoriale", () => {
    expect(build().length).toBe(MATURITY_DECLARATIONS.length);
  });

  it("est déterministe entre deux appels identiques", () => {
    expect(JSON.stringify(build())).toBe(JSON.stringify(build()));
  });

  it("commit-to-content a route=NO_PROMOTION_REQUIRED (approuvé CPO)", () => {
    const p = build().find((x) => x.capabilityId === "commit-to-content")!;
    expect(p.route).toBe("NO_PROMOTION_REQUIRED");
    expect(p.clamped).toBe(false);
    expect(p.effectivePublicMaturity).toBe("INTERNAL_LABS");
  });

  it("opportunity-brief a route=CPO_DISCLOSURE_APPROVAL_REQUIRED (manifeste internal_only)", () => {
    const p = build().find((x) => x.capabilityId === "opportunity-brief")!;
    expect(p.route).toBe("CPO_DISCLOSURE_APPROVAL_REQUIRED");
    expect(p.clamped).toBe(true);
  });

  it("wordpress-publication a route=PRODUCT_MANIFEST_ENTRY_REQUIRED (absent manifeste)", () => {
    const p = build().find((x) => x.capabilityId === "wordpress-publication")!;
    expect(p.route).toBe("PRODUCT_MANIFEST_ENTRY_REQUIRED");
    expect(p.clamped).toBe(true);
  });

  it("chaque promotion contient tous les champs opérationnels requis", () => {
    for (const p of build()) {
      expect(typeof p.capabilityId).toBe("string");
      expect(typeof p.storyKind).toBe("string");
      expect(typeof p.sourceProductRef).toBe("string");
      expect(Array.isArray(p.implementationEvidence)).toBe(true);
      expect(typeof p.disclosureAuthority).toBe("string");
      expect(typeof p.requestedPublicMaturity).toBe("string");
      expect(typeof p.effectivePublicMaturity).toBe("string");
      expect(typeof p.manifestCeiling).toBe("string");
      expect(typeof p.clamped).toBe("boolean");
      expect(typeof p.promotionRequired).toBe("boolean");
      expect(typeof p.customerDeliverableNow).toBe("boolean");
      expect(typeof p.manualEngineeringRequired).toBe("boolean");
      expect(Array.isArray(p.allowedWording)).toBe(true);
      expect(Array.isArray(p.prohibitedWording)).toBe(true);
      expect(Array.isArray(p.allowedCtas)).toBe(true);
      expect(typeof p.blockingReason).toBe("string");
      expect(typeof p.requiredOwner).toBe("string");
      expect(typeof p.requiredNextAction).toBe("string");
      expect(typeof p.route).toBe("string");
    }
  });
});

describe("CTC-5 — éditoriaux et bundles préservés", () => {
  it("les fichiers editorial/ existent pour les 4 surfaces + commit-to-content", () => {
    const base = path.join(SITE_ROOT, "content-bundles/authoritative-a0efa14/editorial");
    // CTC-6 : les fichiers DOIVENT exister — pas de fallback vacuous.
    expect(existsSync(base), `editorial dir absent : ${base}`).toBe(true);
    const files = readdirSync(base);
    for (const surface of ["homepage.md", "product_proof.md", "faq.md", "methodology.md"]) {
      expect(files, `manque ${surface}`).toContain(surface);
    }
  });

  it("R2 bundle reste WAITING_FOR_PRODUCT_MAIN", () => {
    const abs = path.join(SITE_ROOT, "content-bundles/candidate-3cfae58/bundle.json");
    expect(existsSync(abs), `bundle absent : ${abs}`).toBe(true);
    const bundle = JSON.parse(readFileSync(abs, "utf8"));
    expect(bundle.truthLevel).toBe("CANDIDATE");
    expect(bundle.overallStatus).toBe("WAITING_FOR_PRODUCT_MAIN");
  });

  it("Zendesk / Yext ne sont PAS dans le roster (evidence_insufficient)", () => {
    for (const forbidden of ["zendesk", "yext"]) {
      const found = MATURITY_DECLARATIONS.find((d) =>
        d.capabilityId.toLowerCase().includes(forbidden),
      );
      expect(found).toBeUndefined();
    }
  });
});
