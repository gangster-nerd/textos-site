// Tests CTC-6 — corrections P0/P1 CTO review.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

// Précondition environnementale documentée — les tests qui interrogent réellement le dépôt
// produit sont exécutés localement où TEXTOS_PRODUCT_REPO est disponible, et skipped en CI.
const productRepoPath =
  process.env.TEXTOS_PRODUCT_REPO && process.env.TEXTOS_PRODUCT_REPO.length > 0
    ? process.env.TEXTOS_PRODUCT_REPO
    : "/Users/marc/Desktop/textos";
const PRODUCT_REPO_AVAILABLE = existsSync(path.join(productRepoPath, ".git"));

import {
  AUTHORITATIVE_MAIN_SHA,
  R2_CANDIDATE_SHA,
  resolveProductRef,
  computePinnedDeclarationDigest,
} from "@/lib/commit-to-content/resolve-product-ref";
import {
  SELF_SERVE_REQUIRED_CAPABILITIES,
  maturityGate,
  selfServeCtaGate,
} from "@/lib/commit-to-content/publishability";
import { buildPromotionRequests } from "@/lib/commit-to-content/promotion-requests";
import { verifyEditorialCandidates } from "@/lib/commit-to-content/editorial-verifier";
import { summarizeEvidence } from "@/lib/commit-to-content/evidence";
import { loadPinnedManifest } from "@/lib/product-manifest/manifest-schema";

const SITE_ROOT = new URL("..", import.meta.url).pathname;
const pinnedManifest = loadPinnedManifest(SITE_ROOT);

describe.skipIf(!PRODUCT_REPO_AVAILABLE)("CTC-6 — resolveProductRef fail-closed", () => {
  const getDigest = () => computePinnedDeclarationDigest().digest;

  it("SHA autoritatif whitelisté → AUTHORITATIVE_MAIN", () => {
    const ref = resolveProductRef({
      ref: AUTHORITATIVE_MAIN_SHA,
      pinnedDeclarationDigest: getDigest(),
    });
    expect(ref.truthLevel).toBe("AUTHORITATIVE_MAIN");
  });

  it("SHA R2 whitelisté → CANDIDATE", () => {
    const ref = resolveProductRef({
      ref: R2_CANDIDATE_SHA,
      pinnedDeclarationDigest: getDigest(),
    });
    expect(ref.truthLevel).toBe("CANDIDATE");
  });

  it("SHA hors whitelist byte-identique à l'épingle → UNRECOGNIZED_SOURCE_REF (fail-closed)", () => {
    const md = readFileSync(path.join(SITE_ROOT, "product-manifest/IMPORT.md"), "utf8");
    const pinnedSha = md.match(/`([0-9a-f]{40})`/)![1];
    expect(pinnedSha).not.toBe(AUTHORITATIVE_MAIN_SHA);
    const ref = resolveProductRef({
      ref: pinnedSha,
      pinnedDeclarationDigest: getDigest(),
    });
    expect(ref.truthLevel).toBe("UNRECOGNIZED_SOURCE_REF");
    expect(ref.matchesPinnedManifest).toBe(true);
  });
});

describe("CTC-6 — selfServeCtaGate utilise les capacités explicites", () => {
  it("SELF_SERVE_REQUIRED_CAPABILITIES = les trois capacités mandatées", () => {
    expect(SELF_SERVE_REQUIRED_CAPABILITIES).toEqual([
      "self-serve-onboarding",
      "authenticated-product-entry",
      "ui-measurement-launch",
    ]);
  });

  it("capacités requises absentes + aucune activation proposée → GREEN eligible=false", () => {
    const gate = selfServeCtaGate({ manifest: pinnedManifest, activationProposed: false });
    expect(gate.status).toBe("green");
    expect(gate.eligible).toBe(false);
    expect(gate.activationProposed).toBe(false);
    expect(gate.missingCapabilities.length).toBe(3);
  });

  it("capacités requises absentes + activation proposée → RED", () => {
    const gate = selfServeCtaGate({ manifest: pinnedManifest, activationProposed: true });
    expect(gate.status).toBe("red");
    expect(gate.eligible).toBe(false);
    expect(gate.activationProposed).toBe(true);
  });

  it("truth-check/grounded-truth-check/structured-generation NE SONT PLUS dans SELF_SERVE_REQUIRED_CAPABILITIES", () => {
    for (const id of ["truth-check", "grounded-truth-check", "structured-generation"]) {
      expect(SELF_SERVE_REQUIRED_CAPABILITIES as readonly string[]).not.toContain(id);
    }
  });
});

describe("CTC-6 — maturityGate utilise effectiveMaturityWithAuthority", () => {
  it("le gate rapporte évaluées vs quarantaine", () => {
    const g = maturityGate(pinnedManifest);
    expect(g.detail).toMatch(/Évaluées/);
    expect(g.detail).toMatch(/Quarantaine/);
  });

  it("commit-to-content (COMPANY_TECHNOLOGY approuvé CPO) est évalué et vert", () => {
    const g = maturityGate(pinnedManifest);
    expect(g.status).toBe("green");
    expect(g.detail).toContain("commit-to-content");
  });
});

describe.skipIf(!PRODUCT_REPO_AVAILABLE)("CTC-6 — evidence vérifiée au SHA source", () => {
  it("wordpress path evidence résolue à main autoritatif ou R2", () => {
    const s = summarizeEvidence({
      evidenceRefs: ["src/server/textos/act/providers/wordpress/index.ts"],
      authoritativeSha: AUTHORITATIVE_MAIN_SHA,
      candidateSha: R2_CANDIDATE_SHA,
    });
    expect(s.supportedAt === "candidate" || s.supportedAt === "both").toBe(true);
  });

  it("gutenberg-serializer absent à main, présent à R2", () => {
    const s = summarizeEvidence({
      evidenceRefs: [
        "src/server/textos/act/native-composition/gutenberg-serializer.ts",
        "src/server/textos/act/native-composition/gutenberg-vocabulary.ts",
      ],
      authoritativeSha: AUTHORITATIVE_MAIN_SHA,
      candidateSha: R2_CANDIDATE_SHA,
    });
    expect(s.supportedAt).toBe("candidate");
  });

  it("evidence path fictif → EVIDENCE_INSUFFICIENT (supportedAt=neither)", () => {
    const s = summarizeEvidence({
      evidenceRefs: ["src/ghost/does-not-exist.ts"],
      authoritativeSha: AUTHORITATIVE_MAIN_SHA,
      candidateSha: R2_CANDIDATE_SHA,
    });
    expect(s.supportedAt).toBe("neither");
  });
});

describe.skipIf(!PRODUCT_REPO_AVAILABLE)("CTC-6 — routes de promotion utilisent l'evidence vérifiée", () => {
  const build = () =>
    buildPromotionRequests({
      pinnedManifest,
      targetRef: {
        sha: AUTHORITATIVE_MAIN_SHA,
        shortSha: AUTHORITATIVE_MAIN_SHA.slice(0, 7),
        truthLevel: "AUTHORITATIVE_MAIN",
        declarationDigest: "d",
        matchesPinnedManifest: true,
      },
    });

  it("native-composition-gutenberg → PRODUCT_MAIN_REQUIRED (evidence R2-only)", () => {
    const p = build().find((r) => r.capabilityId === "native-composition-gutenberg");
    expect(p!.route).toBe("PRODUCT_MAIN_REQUIRED");
  });

  it("asset-spec, geo-writer, owned-surface-design, query-intelligence → PRODUCT_MANIFEST_ENTRY_REQUIRED", () => {
    const reqs = build();
    for (const id of ["asset-spec", "geo-writer", "owned-surface-design", "query-intelligence"]) {
      const p = reqs.find((r) => r.capabilityId === id);
      expect(p, `promotion request manquante pour ${id}`).toBeDefined();
      expect(p!.route).toBe("PRODUCT_MANIFEST_ENTRY_REQUIRED");
    }
  });

  it("commit-to-content (COMPANY_TECHNOLOGY approuvé) → NO_PROMOTION_REQUIRED", () => {
    const p = build().find((r) => r.capabilityId === "commit-to-content");
    expect(p!.route).toBe("NO_PROMOTION_REQUIRED");
  });

  it("customerDeliverableNow N'EST PAS déduit de la maturité proposée", () => {
    const reqs = build();
    const wp = reqs.find((r) => r.capabilityId === "wordpress-publication")!;
    const asset = reqs.find((r) => r.capabilityId === "asset-spec")!;
    expect(wp.customerDeliverableNow).toBe(true);
    expect(asset.customerDeliverableNow).toBe(false);
  });

  it("EVIDENCE_INSUFFICIENT est réellement atteignable", async () => {
    const mod = await import("@/lib/commit-to-content/promotion-requests");
    expect(mod.PROMOTION_ROUTES).toContain("EVIDENCE_INSUFFICIENT");
    const s = summarizeEvidence({
      evidenceRefs: ["src/ghost/does-not-exist.ts"],
      authoritativeSha: AUTHORITATIVE_MAIN_SHA,
      candidateSha: R2_CANDIDATE_SHA,
    });
    expect(s.supportedAt).toBe("neither");
  });
});

// CI-safe : lit le bundle committé, aucune dépendance git.
describe("CTC-6 — routes committées dans bundle.json (sans dépendance git)", () => {
  const bundle = JSON.parse(
    readFileSync(
      path.join(SITE_ROOT, "content-bundles/authoritative-a0efa14/bundle.json"),
      "utf8",
    ),
  );
  const routes: Record<string, string> = {};
  for (const p of bundle.promotionRequests) routes[p.capabilityId] = p.route;

  it("native-composition-gutenberg → PRODUCT_MAIN_REQUIRED dans bundle committé", () => {
    expect(routes["native-composition-gutenberg"]).toBe("PRODUCT_MAIN_REQUIRED");
  });
  it("asset-spec / geo-writer / owned-surface-design / query-intelligence → PRODUCT_MANIFEST_ENTRY_REQUIRED", () => {
    for (const id of ["asset-spec", "geo-writer", "owned-surface-design", "query-intelligence"]) {
      expect(routes[id]).toBe("PRODUCT_MANIFEST_ENTRY_REQUIRED");
    }
  });
  it("opportunity-brief / repos-intersection → CPO_DISCLOSURE_APPROVAL_REQUIRED", () => {
    for (const id of ["opportunity-brief", "repos-intersection"]) {
      expect(routes[id]).toBe("CPO_DISCLOSURE_APPROVAL_REQUIRED");
    }
  });
  it("commit-to-content → NO_PROMOTION_REQUIRED", () => {
    expect(routes["commit-to-content"]).toBe("NO_PROMOTION_REQUIRED");
  });
  it("customerDeliverableNow explicite (pas déduit)", () => {
    const wp = bundle.promotionRequests.find(
      (p: { capabilityId: string }) => p.capabilityId === "wordpress-publication",
    );
    const asset = bundle.promotionRequests.find(
      (p: { capabilityId: string }) => p.capabilityId === "asset-spec",
    );
    expect(wp.customerDeliverableNow).toBe(true);
    expect(asset.customerDeliverableNow).toBe(false);
  });
});

describe("CTC-6 — editorial candidates dans le bundle + hash vérifié", () => {
  it("bundle.json contient editorialCandidates avec sha256 + provenance", () => {
    const bundle = JSON.parse(
      readFileSync(
        path.join(SITE_ROOT, "content-bundles/authoritative-a0efa14/bundle.json"),
        "utf8",
      ),
    );
    expect(Array.isArray(bundle.editorialCandidates)).toBe(true);
    expect(bundle.editorialCandidates.length).toBeGreaterThanOrEqual(4);
    for (const c of bundle.editorialCandidates) {
      expect(typeof c.path).toBe("string");
      expect(typeof c.sha256).toBe("string");
      expect(c.sha256.length).toBe(64);
      expect(typeof c.classification).toBe("string");
      expect(typeof c.sourceProductRef).toBe("string");
      expect(typeof c.truthLevel).toBe("string");
      expect(Array.isArray(c.basisCapabilityIds)).toBe(true);
      expect(Array.isArray(c.basisClaimIds)).toBe(true);
      expect(typeof c.disclosureAuthority).toBe("string");
      expect(typeof c.proposedPublishability).toBe("string");
      expect(typeof c.language).toBe("string");
    }
  });

  it("verifyEditorialCandidates GREEN sur bundle courant", () => {
    const dir = path.join(SITE_ROOT, "content-bundles/authoritative-a0efa14");
    const bundle = JSON.parse(readFileSync(path.join(dir, "bundle.json"), "utf8"));
    const failures = verifyEditorialCandidates({
      bundleDir: dir,
      editorialCandidates: bundle.editorialCandidates,
      selfServeEligible: false,
    });
    expect(failures).toEqual([]);
  });
});

describe("CTC-6 — mutation test : altération d'un fichier éditorial casse content:verify", () => {
  const dir = path.join(SITE_ROOT, "content-bundles/authoritative-a0efa14");
  const editorialPath = path.join(dir, "editorial/faq.md");
  const original = readFileSync(editorialPath, "utf8");

  afterAll(() => {
    writeFileSync(editorialPath, original, "utf8");
  });

  it("altération d'un fichier éditorial produit une divergence de hash", () => {
    const bundle = JSON.parse(readFileSync(path.join(dir, "bundle.json"), "utf8"));
    writeFileSync(editorialPath, original + "\n<!-- mutation test CTC-6 -->\n", "utf8");
    const failures = verifyEditorialCandidates({
      bundleDir: dir,
      editorialCandidates: bundle.editorialCandidates,
      selfServeEligible: false,
    });
    const hashFailure = failures.find((f) => f.message.includes("Hash divergent"));
    expect(hashFailure).toBeDefined();
  });
});

describe("CTC-6 — dogfooding cross-produit corrigé", () => {
  it("le candidat CTC ne prétend plus que ShortsOS/RepOS sont déjà dogfoodés", () => {
    const abs = path.join(
      SITE_ROOT,
      "content-bundles/authoritative-a0efa14/editorial/commit-to-content-technology-story.md",
    );
    expect(existsSync(abs)).toBe(true);
    const body = readFileSync(abs, "utf8");
    expect(body).toMatch(/intended next|not yet been demonstrated|intended next industrialization/i);
    expect(body).not.toMatch(/dogfooded across TextOS, ShortsOS and RepOS/i);
  });
});

describe("CTC-6 — définitions Direct/Indirect corrigées", () => {
  const faq = readFileSync(
    path.join(SITE_ROOT, "content-bundles/authoritative-a0efa14/editorial/faq.md"),
    "utf8",
  );

  it("Direct = cité comme SOURCE par l'answer engine", () => {
    expect(faq).toContain("cited as a source by the answer engine");
  });

  it("Indirect = nommé dans le TEXTE de la réponse, indépendamment de la citation", () => {
    expect(faq).toContain("named inside the answer text");
    expect(faq).toContain("independently");
  });

  it("Total = UNION, jamais somme arithmétique", () => {
    expect(faq).toMatch(/union.*never.*arithmetic sum/is);
  });

  it("le candidat FAQ rejette l'ancienne définition erronée", () => {
    expect(faq).not.toContain("tiers cité");
    expect(faq).not.toContain("réponse directe à la requête");
  });
});

describe("CTC-6 — visitor-facing candidates en anglais", () => {
  it("homepage, product_proof, faq et methodology candidates ont language=en dans le frontmatter", () => {
    for (const name of ["homepage.md", "product_proof.md", "faq.md", "methodology.md"]) {
      const abs = path.join(
        SITE_ROOT,
        "content-bundles/authoritative-a0efa14/editorial",
        name,
      );
      expect(existsSync(abs), name).toBe(true);
      const front = readFileSync(abs, "utf8").match(/^---\n([\s\S]*?)\n---/);
      expect(front?.[1]).toContain("language: en");
    }
  });
});
