import { describe, expect, it } from "vitest";

import type { CapabilityDeclaration } from "@/lib/capability-registry";
import { manifestCeiling } from "@/lib/commit-to-content/maturity";
import { earlyDisclosureLabel, earlyDisclosureOf, findAvailabilityPromises } from "@/lib/content/early-disclosure";
import { BETA_ACCESS_COPY, decideBetaAccessEntry } from "@/lib/conversion/beta-access-entry";
import { FORBIDDEN_CONVERSION_PHRASES } from "@/lib/conversion/measurement-request-copy";
import { blocking, compareDeclarations } from "@/lib/product-manifest/drift";
import { ProductManifestSchema, type ManifestEntity, type ProductManifest } from "@/lib/product-manifest/manifest-schema";
import { earlyDisclosureIssues } from "@/lib/textos-client/ctc-articles";

// ADR-032 du produit — divulgation anticipée (« Bêta », « Bientôt »), BÊTA-4 côté site.

const SHA = "4d37616453f5d0fed24a8054314d49651e33af6b";

const entity = (overrides: Partial<ManifestEntity> = {}): ManifestEntity => ({
  id: "capacite-beta",
  kind: "capability",
  implementationStatus: "wip_committed_tested",
  publicationStatus: "public_beta",
  allowedSurfaces: ["homepage", "faq", "product_article"],
  publicationDecision: { decidedIn: "docs/decision.md", recordedAt: "2026-10-28" },
  evidence: [{ id: "bundle-v1", commits: [], paths: ["src/x.ts"], tests: [], adrs: [] }],
  prohibitedClaims: [],
  knownLimits: [],
  ...overrides,
});

const manifestOf = (entities: ManifestEntity[], statusVocabularyVersion = 4): ProductManifest => ({
  schemaVersion: 2,
  statusVocabularyVersion,
  productRepository: "textos-v0",
  snapshotCommit: SHA,
  snapshotCommittedAt: "2026-10-28",
  coverage: { kind: "complete" },
  entities,
});

const site = (overrides: Partial<CapabilityDeclaration> = {}): CapabilityDeclaration => ({
  kind: "capability",
  implementationStatus: "wip_committed_tested",
  publicationStatus: "public_beta",
  claimedSurfaces: ["faq"],
  label: "Capacité bêta",
  ...overrides,
});

describe("manifeste v4 — vocabulaire de divulgation anticipée", () => {
  it("lit un manifeste v4 et un manifeste v3 ; refuse une version inconnue", () => {
    expect(ProductManifestSchema.safeParse(manifestOf([entity()])).success).toBe(true);
    expect(ProductManifestSchema.safeParse(manifestOf([entity({ publicationStatus: "candidate" })], 3)).success).toBe(true);
    expect(ProductManifestSchema.safeParse(manifestOf([entity()], 5)).success).toBe(false);
  });

  it("refuse un manifeste v3 qui porte un statut v4 — la version contredit le contenu", () => {
    const result = ProductManifestSchema.safeParse(manifestOf([entity()], 3));
    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).toMatch(/absent du vocabulaire v3/);
  });

  it("refuse une bêta ou une capacité à venir sur pricing ou sales_copy", () => {
    for (const surface of ["pricing", "sales_copy"] as const) {
      const result = ProductManifestSchema.safeParse(manifestOf([entity({ allowedSurfaces: ["faq", surface] })]));
      expect(result.success).toBe(false);
      expect(JSON.stringify(result)).toMatch(new RegExp(`n'ouvre pas ${surface}`));
    }
  });
});

describe("dérive — la divulgation anticipée suit exactement le produit", () => {
  it("bloque un site qui affiche une bêta que le produit ne déclare pas, et l'inverse", () => {
    const productCandidate = manifestOf([entity({ publicationStatus: "candidate" })]);
    const siteBeta = { "capacite-beta": site() };
    expect(blocking(compareDeclarations(siteBeta, productCandidate)).map((f) => f.kind)).toContain("early_disclosure_divergence");
    const productBeta = manifestOf([entity()]);
    const siteCandidate = { "capacite-beta": site({ publicationStatus: "candidate" }) };
    expect(blocking(compareDeclarations(siteCandidate, productBeta)).map((f) => f.kind)).toContain("early_disclosure_divergence");
    expect(blocking(compareDeclarations(siteBeta, productBeta))).toEqual([]);
  });
});

describe("label et promesses", () => {
  it("label dans la langue de la page ; bêta et bientôt ont leur plafond de maturité", () => {
    expect([earlyDisclosureLabel("beta", "en"), earlyDisclosureLabel("upcoming", "en")]).toEqual(["Beta", "Coming soon"]);
    expect([earlyDisclosureLabel("beta", "fr"), earlyDisclosureLabel("upcoming", "fr")]).toEqual(["Bêta", "Bientôt"]);
    expect(manifestCeiling(manifestOf([entity()]), "capacite-beta")).toBe("PUBLIC_BETA");
    expect(manifestCeiling(manifestOf([entity({ publicationStatus: "public_upcoming", implementationStatus: "planned", evidence: [] })]), "capacite-beta")).toBe("PUBLIC_ROADMAP");
  });

  it("relève dates et promesses (copie du gate produit early-disclosure-gate@1), pas les usages ordinaires", () => {
    const rules = (text: string) => findAvailabilityPromises([{ where: "body", text }]).map((p) => p.rule);
    expect(rules("Generally available in March 2027.")).toEqual(expect.arrayContaining(["general_availability_en", "month_year"]));
    expect(rules("Disponible dès le T2 2027.")).toEqual(expect.arrayContaining(["availability_fr", "quarter_or_half"]));
    expect(rules("Available evidence is listed under Sources.")).toEqual([]);
  });
});

describe("CTA d'accès bêta — entrée produit, hors registre", () => {
  const base = {
    mode: "demo" as const,
    capabilityId: "capacite-beta",
    productStatus: "public_beta" as const,
    siteStatus: "public_beta" as const,
    entryUrl: "https://app.example.test/auth/start",
    contentId: "faq:capacite-beta",
    position: "final" as const,
  };

  it("mène à /auth/start avec l'intention beta_access et la capacité, plus l'attribution du site", () => {
    const decision = decideBetaAccessEntry(base);
    expect(decision.kind).toBe("render");
    const url = new URL((decision as { href: string }).href);
    expect(url.origin + url.pathname).toBe("https://app.example.test/auth/start");
    expect(url.searchParams.get("intent")).toBe("beta_access");
    expect(url.searchParams.get("capability")).toBe("capacite-beta");
    expect(url.searchParams.get("ctaVariant")).toBe("beta_access");
    expect(url.searchParams.get("source")).toBe("textos-site");
  });

  it("ne rend rien hors bêta, sans URL conforme, ou conversion coupée", () => {
    expect(decideBetaAccessEntry({ ...base, productStatus: "public_upcoming" })).toEqual({ kind: "none", reason: "not_in_beta" });
    expect(decideBetaAccessEntry({ ...base, siteStatus: "candidate" })).toEqual({ kind: "none", reason: "not_in_beta" });
    expect(decideBetaAccessEntry({ ...base, capabilityId: "../x" })).toEqual({ kind: "none", reason: "not_in_beta" });
    expect(decideBetaAccessEntry({ ...base, entryUrl: "" })).toEqual({ kind: "none", reason: "entry_url_missing" });
    expect(decideBetaAccessEntry({ ...base, entryUrl: "http://app.example.test/auth/start" })).toEqual({ kind: "none", reason: "entry_url_invalid" });
    expect(decideBetaAccessEntry({ ...base, mode: "off" })).toEqual({ kind: "none", reason: "conversion_off" });
  });

  it("la copy ne promet ni délai, ni activation, ni date", () => {
    const copy = Object.values(BETA_ACCESS_COPY).join(" ").toLowerCase();
    for (const phrase of FORBIDDEN_CONVERSION_PHRASES) expect(copy).not.toContain(phrase);
    expect(findAvailabilityPromises([{ where: "copy", text: Object.values(BETA_ACCESS_COPY).join(" ") }])).toEqual([]);
  });
});

describe("notes Commit-to-Content — la revue doit porter la divulgation", () => {
  const statuses = new Map([["capacite-beta", "public_beta" as const]]);
  const disclosure = { capabilityId: "capacite-beta", label: "beta", cta: "beta_access", availabilityPromises: [] };
  const record = (earlyDisclosure: unknown) => ({ release: { allowed: true, blockers: [] }, cmoV2Conformance: { passed: true }, earlyDisclosure }) as never;

  it("accepte une note sur une bêta revue avec sa divulgation", () => {
    expect(earlyDisclosureIssues({ entityIds: ["capacite-beta"] }, record(disclosure), statuses)).toEqual([]);
    expect(earlyDisclosureOf("capacite-beta", "public_beta")).toMatchObject({ label: "beta", cta: "beta_access" });
  });

  it("refuse une note sur une bêta revue sans divulgation, avec une divulgation fausse, ou avec une promesse", () => {
    expect(earlyDisclosureIssues({ entityIds: ["capacite-beta"] }, record(null), statuses)[0]).toMatch(/carries no early disclosure/);
    expect(earlyDisclosureIssues({ entityIds: ["capacite-beta"] }, record({ ...disclosure, label: "upcoming" }), statuses)[0]).toMatch(/does not match/);
    expect(earlyDisclosureIssues({ entityIds: ["capacite-beta"] }, record({ ...disclosure, availabilityPromises: [{}] }), statuses)).toContain(
      "the review found a date or an availability promise",
    );
    // Une divulgation que le manifeste épinglé ne déclare pas est refusée aussi.
    expect(earlyDisclosureIssues({ entityIds: ["autre"] }, record(disclosure), statuses)[0]).toMatch(/does not declare/);
  });
});
