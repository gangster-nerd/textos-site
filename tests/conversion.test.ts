// Tests des primitives de conversion S1 : registres comme contrats exécutables, résolution CTA
// unique, gate visuel, identité de contenu.
//
// Principe : on ne mute JAMAIS les registres réels. Les cas « approved » sont testés par des
// FIXTURES injectées dans les fonctions pures — muter le registre partagé rendrait l'ordre des
// tests significatif et masquerait l'état réel de S1 (tout est `disabled`).

import { describe, expect, test } from "vitest";

import {
  CONTENT_CLUSTERS,
  ContentClusterSchema,
} from "@/lib/content/content-cluster-registry";
import { deriveContentId, deriveContentPath } from "@/lib/content/content-loader";
import { ContentFrontmatterSchema } from "@/lib/content/content-schema";
import { runGates } from "@/lib/content/content-gates";
import {
  CTA_VARIANTS,
  CtaVariantSchema,
  getCtaVariant,
} from "@/lib/conversion/cta-registry";
import {
  assertCtaPublishable,
  ctaViolations,
  resolveCtaForDocument,
} from "@/lib/conversion/cta-resolver";
import { VISUALS, VisualAssetSchema } from "@/lib/visuals/visual-registry";
import { CLAIMS } from "@/lib/claims-registry";

/** Livraison par défaut pour les tests de résolution : mode `demo`, route présente. */
const DELIVERY = {
  mode: "demo" as const,
  routeExists: () => true,
  endpointConfigured: false,
  legalNoticePublished: false,
};

const base = {
  title: "T",
  description: "D",
  contentType: "faq_entry" as const,
  language: "en" as const,
  editorialStatus: "published" as const,
  indexingPolicy: "noindex" as const,
  publishedAt: "2026-07-31",
  updatedAt: "2026-07-31",
  sourceCommit: "1178684",
  capabilityIds: ["claim-evidence-layer"],
  claimIds: ["s8-answer-evidence-capture"],
  clusterId: "measurement-trust",
  ctaVariant: "measurement_request",
  targetQuery: "q",
  searchIntent: "commercial_investigation" as const,
  shortAnswer: { body: "b", claimIds: ["s8-answer-evidence-capture"] },
};

/** Fixture CTA : jamais le registre réel. */
const approvedFixture = (over: Record<string, unknown> = {}) => ({
  id: "trial",
  status: "approved",
  requiredCapabilities: [],
  allowedContentTypes: ["faq_entry"],
  destination: "/request",
  title: "Start",
  body: "Body",
  primaryLabel: "Go",
  claimIds: [],
  version: 1,
  ...over,
});

describe("frontmatter — le contenu déclare des identifiants, jamais de copy", () => {
  test("un contenu tentant de définir sa propre copy CTA est rejeté", () => {
    for (const smuggled of [
      { ctaTitle: "Buy now" },
      { ctaBody: "Best tool ever" },
      { ctaButton: "Click" },
      { ctaUrl: "https://example.com" },
      { ctaDisclaimer: "*terms apply" },
      { visualPrompt: "draw a chart" },
      { visualCaption: "my own caption" },
    ]) {
      const result = ContentFrontmatterSchema.safeParse({ ...base, ...smuggled });
      expect(result.success, `champ accepté à tort : ${Object.keys(smuggled)[0]}`).toBe(
        false
      );
    }
  });

  test("clusterId et ctaVariant sont requis", () => {
    const { clusterId, ...noCluster } = base;
    const { ctaVariant, ...noCta } = base;
    expect(ContentFrontmatterSchema.safeParse(noCluster).success).toBe(false);
    expect(ContentFrontmatterSchema.safeParse(noCta).success).toBe(false);
  });

  test("visualIds est optionnel", () => {
    expect(ContentFrontmatterSchema.safeParse(base).success).toBe(true);
  });
});

describe("gates — appartenance aux registres", () => {
  test("clusterId inconnu → échec", () => {
    const fm = ContentFrontmatterSchema.parse({ ...base, clusterId: "nope" });
    expect(() => runGates(fm, "slug-ok")).toThrow(/Cluster inconnu/);
  });

  test("ctaVariant inconnue → échec", () => {
    const fm = ContentFrontmatterSchema.parse({ ...base, ctaVariant: "nope" });
    expect(() => runGates(fm, "slug-ok")).toThrow(/CTA inconnue/);
  });

  test("visualId inconnu → échec", () => {
    const fm = ContentFrontmatterSchema.parse({ ...base, visualIds: ["nope"] });
    expect(() => runGates(fm, "slug-ok")).toThrow(/Visuel inconnu/);
  });

  test("visuel autorisé sur un autre contentType → échec", () => {
    // epistemic-layers-v1 n'est autorisé que sur faq_entry.
    const fm = ContentFrontmatterSchema.parse({
      ...base,
      contentType: "developer_note",
      capabilityIds: ["claim-evidence-layer"],
      visualIds: ["epistemic-layers-v1"],
      claimIds: [
        "s8-answer-evidence-capture",
        "s8-deterministic-extraction",
        "s8-no-automatic-verification",
      ],
      ctaVariant: "claim_lookup",
    });
    expect(() => runGates(fm, "slug-ok")).toThrow(/non autorisé sur le contentType/);
  });

  test("visuel portant un claim hors du document → échec (pas de claim clandestin)", () => {
    // Le document ne déclare qu'un des trois claims portés par le visuel.
    const fm = ContentFrontmatterSchema.parse({
      ...base,
      visualIds: ["epistemic-layers-v1"],
      claimIds: ["s8-answer-evidence-capture"],
    });
    expect(() => runGates(fm, "slug-ok")).toThrow(
      /absent des claimIds du document|ne peut pas introduire un claim/
    );
  });

  test("visuel dont tous les claims sont déclarés → accepté", () => {
    const fm = ContentFrontmatterSchema.parse({
      ...base,
      visualIds: ["epistemic-layers-v1"],
      claimIds: [
        "s8-answer-evidence-capture",
        "s8-deterministic-extraction",
        "s8-no-automatic-verification",
      ],
    });
    expect(() => runGates(fm, "slug-ok")).not.toThrow();
  });
});

describe("registres — contrats exécutables (Zod), pas de simples types", () => {
  test("un asset visuel sans alt / caption / claimIds est rejeté au runtime", () => {
    const valid = VISUALS["epistemic-layers-v1"];
    expect(VisualAssetSchema.safeParse({ ...valid, alt: "  " }).success).toBe(false);
    expect(VisualAssetSchema.safeParse({ ...valid, caption: "" }).success).toBe(false);
    expect(VisualAssetSchema.safeParse({ ...valid, claimIds: [] }).success).toBe(false);
  });

  test("une variante approved sans destination est rejetée (fixture, pas le registre réel)", () => {
    expect(
      CtaVariantSchema.safeParse(approvedFixture({ destination: null })).success
    ).toBe(false);
  });

  test("une variante approved sans copy est rejetée", () => {
    expect(CtaVariantSchema.safeParse(approvedFixture({ title: "" })).success).toBe(false);
    expect(
      CtaVariantSchema.safeParse(approvedFixture({ primaryLabel: " " })).success
    ).toBe(false);
  });

  test("un cluster sans label est rejeté", () => {
    expect(
      ContentClusterSchema.safeParse({ ...CONTENT_CLUSTERS["measurement-trust"], label: "" })
        .success
    ).toBe(false);
  });

  test("un champ spéculatif dans un registre est rejeté (.strict())", () => {
    expect(
      VisualAssetSchema.safeParse({
        ...VISUALS["epistemic-layers-v1"],
        sourceRefs: ["x"],
      }).success
    ).toBe(false);
  });
});

describe("résolution CTA — stricte, contexte toujours complet", () => {
  test("état S2A : seule measurement_request est approuvée", () => {
    expect(CTA_VARIANTS.measurement_request.status).toBe("approved");
    for (const id of ["claim_lookup", "trial", "none"] as const) {
      expect(CTA_VARIANTS[id].status, `${id} doit rester disabled`).toBe("disabled");
    }
  });

  test("le resolver exige le contexte — aucun paramètre optionnel", () => {
    // Contrat de type : `contentType` est requis. Un appel sans contexte ne compile pas ; on le
    // documente ici pour que la suppression de cette exigence casse un test, pas seulement un type.
    const call = resolveCtaForDocument as unknown as (i: Record<string, unknown>) => unknown;
    expect(() => call({ configuredVariant: "measurement_request" })).not.toThrow();
    // Avec le contexte complet, la résolution aboutit — c'est bien le contexte qui décide.
    const r = resolveCtaForDocument({ configuredVariant: "measurement_request", contentType: "faq_entry", delivery: DELIVERY });
    expect(r.resolvedVariant).toBe("measurement_request");
    expect(r.version).toBe(1);
  });

  test("une variante disabled ne rend aucun CTA", () => {
    const r = resolveCtaForDocument({ configuredVariant: "claim_lookup", contentType: "faq_entry", delivery: DELIVERY });
    expect(r.resolvedVariant).toBeNull();
    expect(r.definition).toBeNull();
    expect(r.version).toBeNull();
    expect(r.configuredVariant).toBe("claim_lookup");
  });

  test("none est un sentinel : résout toujours vers null", () => {
    expect(
      resolveCtaForDocument({ configuredVariant: "none", contentType: "faq_entry", delivery: DELIVERY })
        .resolvedVariant
    ).toBeNull();
    expect(getCtaVariant("none")!.id).toBe("none");
  });

  test("une variante inconnue résout vers null sans lever", () => {
    const r = resolveCtaForDocument({ configuredVariant: "ghost", contentType: "faq_entry", delivery: DELIVERY });
    expect(r.resolvedVariant).toBeNull();
    expect(r.configuredVariant).toBe("ghost");
  });

  test("resolvedVariant et version valent null ensemble, jamais l'un sans l'autre", () => {
    const r = resolveCtaForDocument({ configuredVariant: "trial", contentType: "faq_entry", delivery: DELIVERY });
    expect(r.resolvedVariant === null).toBe(r.version === null);
  });

  test("approved + requiredCapability non public_marketable → échec bruyant", () => {
    // claim-evidence-layer est wip_committed_tested dans le registre de capacités.
    expect(() =>
      assertCtaPublishable(
        approvedFixture({
          requiredCapabilities: ["claim-evidence-layer"],
          claimIds: [],
        }) as never,
        "faq_entry"
      )
    ).toThrow(/non public_marketable/);
  });

  test("approved + capacité inconnue → échec bruyant", () => {
    expect(() =>
      assertCtaPublishable(
        approvedFixture({ requiredCapabilities: ["ghost-capability"], claimIds: [] }) as never,
        "faq_entry"
      )
    ).toThrow(/capacité inconnue/);
  });

  test("approved sans destination → échec bruyant", () => {
    expect(() =>
      assertCtaPublishable(approvedFixture({ destination: null, claimIds: [] }) as never, "faq_entry")
    ).toThrow(/sans destination/);
  });

  test("approved sur un contentType non autorisé → échec bruyant", () => {
    expect(() =>
      assertCtaPublishable(
        approvedFixture({ allowedContentTypes: ["product_article"], claimIds: [] }) as never,
        "faq_entry"
      )
    ).toThrow(/non autorisée sur le contentType/);
  });

  test("un claim CTA hors requiredCapabilities est rejeté", () => {
    // s8-answer-evidence-capture est rattaché à claim-evidence-layer, que ce CTA ne requiert pas.
    const problems = ctaViolations(
      approvedFixture({
        requiredCapabilities: ["observe-authority-presence"],
        claimIds: ["s8-answer-evidence-capture"],
      }) as never,
      "faq_entry"
    );
    expect(problems.join(" ")).toMatch(/hors des requiredCapabilities/);
  });

  test("un claim CTA à capabilityId null est rejeté (n'appartient à aucun ensemble)", () => {
    const problems = ctaViolations(
      approvedFixture({
        requiredCapabilities: ["observe-authority-presence"],
        claimIds: ["hp1-measurement-doctrine"],
      }) as never,
      "faq_entry"
    );
    expect(problems.join(" ")).toMatch(/capabilityId null/);
  });

  test("un claim CTA non autorisé sur sales_copy est rejeté", () => {
    const problems = ctaViolations(
      approvedFixture({
        requiredCapabilities: ["claim-evidence-layer"],
        claimIds: ["s8-answer-evidence-capture"],
      }) as never,
      "faq_entry"
    );
    expect(problems.join(" ")).toMatch(/non autorisé sur la surface sales_copy/);
  });
});

describe("séparation éditorial / commercial (arbitrage S1)", () => {
  test("un CTA est éligible sur un document aux capabilityIds DIFFÉRENTS des siennes", () => {
    // Le document ne parle que de claim-evidence-layer ; le CTA vend observe-authority-presence.
    // Aucune inclusion n'est exigée : le CTA est prouvé par ses propres claims.
    const fm = ContentFrontmatterSchema.parse(base);
    expect(fm.capabilityIds).toEqual(["claim-evidence-layer"]);

    const problems = ctaViolations(
      approvedFixture({
        requiredCapabilities: ["observe-authority-presence"],
        claimIds: [],
      }) as never,
      "faq_entry"
    );
    expect(problems).toEqual([]);
    // …et le gate complet laisse passer le document, dont le CTA reste disabled en S1.
    expect(() => runGates(fm, "slug-ok")).not.toThrow();
  });

  test("le gate n'exige JAMAIS requiredCapabilities ⊆ capabilityIds du document", () => {
    const problems = ctaViolations(
      approvedFixture({
        requiredCapabilities: ["observe-authority-presence", "quality-ledger"],
        claimIds: [],
      }) as never,
      "faq_entry"
    );
    expect(problems.join(" ")).not.toMatch(/capabilityIds du document/);
  });
});

// S2.0A — les claims commerciaux EXISTENT désormais. Ce bloc a remplacé le test « prérequis S2 »
// de S1, qui asserait leur absence : il a rougi le jour où on l'a satisfait, exactement comme
// prévu. Il garde maintenant l'invariant inverse — la surface sales_copy est peuplée, gouvernée,
// et ce qui bloque encore le CTA n'est plus la matière mais la LIVRAISON (endpoint, mentions).
describe("S2.0A — surface sales_copy peuplée et gouvernée", () => {
  test("des claims commerciaux existent, tous rattachés à une capacité", () => {
    const onSales = CLAIMS.filter((c) => c.allowedSurfaces.includes("sales_copy"));
    expect(onSales.length).toBeGreaterThan(0);
    for (const c of onSales) {
      expect(c.capabilityId, `${c.id} sans capacité`).not.toBeNull();
    }
  });

  test("aucun claim doctrinal (capabilityId null) n'a été ouvert à sales_copy", () => {
    const doctrinal = CLAIMS.filter((c) => c.capabilityId === null);
    expect(doctrinal.length).toBeGreaterThan(0);
    for (const c of doctrinal) {
      expect(c.allowedSurfaces, `${c.id} ne doit pas atteindre sales_copy`).not.toContain(
        "sales_copy"
      );
    }
  });

  test("measurement_request ne viole plus aucune règle de claims", () => {
    const real = getCtaVariant("measurement_request")!;
    const problems = ctaViolations({ ...real, status: "approved" }, "faq_entry");
    expect(problems).toEqual([]);
  });

  test("il reste néanmoins disabled — la livraison n'est pas prouvée", () => {
    expect(getCtaVariant("measurement_request")!.status).toBe("approved");
  });
});

describe("identité de contenu — dérivée, stable, partagée", () => {
  test("contentId = collection:slug, path = /collection/slug", () => {
    expect(deriveContentId("faq", "x-y")).toBe("faq:x-y");
    expect(deriveContentPath("faq", "x-y")).toBe("/faq/x-y");
  });

  test("l'identité n'est pas déclarable en frontmatter", () => {
    expect(
      ContentFrontmatterSchema.safeParse({ ...base, contentId: "faq:custom" }).success
    ).toBe(false);
  });

  test("aucune URL absolue dans le path dérivé", () => {
    expect(deriveContentPath("faq", "x")).not.toMatch(/^https?:/);
  });
});
