import { describe, expect, it } from "vitest";

import {
  allowsSurface,
  CAPABILITY_REGISTRY,
  FEATURE_LIST,
  findCapability,
  isMarketable,
  isMarketableOn,
  type CapabilityDeclaration,
} from "@/lib/capability-registry";
import { blocking, compareDeclarations, reported } from "@/lib/product-manifest/drift";
import {
  loadPinnedManifest,
  ProductManifestSchema,
  type ManifestEntity,
  type ProductManifest,
} from "@/lib/product-manifest/manifest-schema";
import { blockingProblems, checkProvenance, isProven } from "@/lib/product-manifest/provenance";
import { PUBLIC_SURFACES } from "@/lib/product-manifest/status-axes";
import { SURFACES } from "@/lib/claims-registry";
import { routedCollections } from "@/lib/content/attribution-manifest";
import { loadCollection } from "@/lib/content/content-loader";

const SHA = "4d37616453f5d0fed24a8054314d49651e33af6b";

function entity(overrides: Partial<ManifestEntity> = {}): ManifestEntity {
  return {
    id: "example-capability",
    kind: "capability",
    implementationStatus: "implemented",
    publicationStatus: "internal_only",
    allowedSurfaces: [],
    publicationDecision: { decidedIn: "docs/decision.md", recordedAt: "2026-08-04" },
    evidence: [{ id: "bundle-v1", commits: [], paths: ["src/x.ts"], tests: [], adrs: [] }],
    prohibitedClaims: [],
    knownLimits: [],
    ...overrides,
  };
}

const manifestOf = (entities: ManifestEntity[]): ProductManifest => ({
  schemaVersion: 2,
  statusVocabularyVersion: 3,
  productRepository: "textos-v0",
  snapshotCommit: SHA,
  snapshotCommittedAt: "2026-08-05",
  coverage: { kind: "complete" },
  entities,
});

const site = (overrides: Partial<CapabilityDeclaration> = {}): CapabilityDeclaration => ({
  kind: "capability",
  implementationStatus: "implemented",
  publicationStatus: "internal_only",
  claimedSurfaces: [],
  ...overrides,
});

describe("registre migré à deux axes", () => {
  it("exprime implemented + internal_only — l'état que l'échelle unique rendait impossible", () => {
    for (const id of ["opportunity-brief", "truth-check", "repos-intersection"] as const) {
      const declaration = findCapability(id);
      expect(declaration?.implementationStatus).toBe("implemented");
      expect(declaration?.publicationStatus).toBe("internal_only");
      expect(declaration?.claimedSurfaces).toEqual([]);
    }
  });

  it("ne dérive la marketabilité que de l'axe éditorial", () => {
    // Trois capacités sont `implemented` sans être commercialisables : si la marketabilité se
    // dérivait de l'axe technique, elles apparaîtraient dans featureList.
    expect(FEATURE_LIST).toHaveLength(5);
    expect(FEATURE_LIST).not.toContain("truth-check");
    expect(isMarketable(site({ implementationStatus: "implemented" }))).toBe(false);
  });

  it("n'ouvre la copy commerciale qu'à la capacité que la copy nomme", () => {
    const commercial = Object.entries(CAPABILITY_REGISTRY).filter(([, declaration]) =>
      declaration.claimedSurfaces.includes("sales_copy")
    );
    expect(commercial.map(([id]) => id)).toEqual(["observe-authority-presence"]);
  });
});

describe("ingestion du manifeste", () => {
  it("refuse un vocabulaire inconnu plutôt que de l'interpréter partiellement", () => {
    const result = ProductManifestSchema.safeParse({
      ...manifestOf([entity()]),
      statusVocabularyVersion: 99,
    });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).toMatch(/Vocabulaire non supporté/);
  });

  it("refuse un champ inconnu — il pourrait porter une restriction ignorée ici", () => {
    const result = ProductManifestSchema.safeParse({
      ...manifestOf([entity()]),
      newRestriction: ["ne pas dire ceci"],
    });
    expect(result.success).toBe(false);
  });

  it("revérifie les invariants du produit plutôt que de faire confiance à sa CI", () => {
    const contradictory = ProductManifestSchema.safeParse(
      manifestOf([entity({ kind: "prohibited_concept", implementationStatus: "implemented" })])
    );
    expect(contradictory.success).toBe(false);
  });

  it("refuse deux bundles de même identifiant — une référence doit désigner une seule preuve", () => {
    const duplicated = ProductManifestSchema.safeParse(
      manifestOf([
        entity({
          evidence: [
            { id: "b-v1", commits: [], paths: ["a.ts"], tests: [], adrs: [] },
            { id: "b-v1", commits: [], paths: ["b.ts"], tests: [], adrs: [] },
          ],
        }),
      ])
    );
    expect(duplicated.success).toBe(false);
  });
});

describe("asymétrie de la dérive", () => {
  it("BLOQUE une surface revendiquée que le produit n'autorise pas", () => {
    const findings = compareDeclarations(
      { "example-capability": site({ publicationStatus: "candidate", claimedSurfaces: ["faq"] }) },
      manifestOf([entity({ publicationStatus: "candidate", allowedSurfaces: [] })])
    );
    expect(blocking(findings).map((f) => f.kind)).toContain("site_surface_not_allowed");
  });

  it("BLOQUE une commercialisation que le produit ne reconnaît pas", () => {
    const findings = compareDeclarations(
      {
        "example-capability": site({
          publicationStatus: "public_marketable",
          claimedSurfaces: ["homepage"],
        }),
      },
      manifestOf([entity({ publicationStatus: "candidate", allowedSurfaces: ["homepage"] })])
    );
    expect(blocking(findings).map((f) => f.kind)).toContain("site_publication_more_permissive");
  });

  it("BLOQUE un avancement technique que le produit ne déclare pas", () => {
    const findings = compareDeclarations(
      { "example-capability": site({ implementationStatus: "implemented" }) },
      manifestOf([entity({ implementationStatus: "wip_committed_tested" })])
    );
    expect(blocking(findings).map((f) => f.kind)).toContain("site_ahead_implementation");
  });

  it("RAPPORTE sans bloquer un site plus restrictif", () => {
    const findings = compareDeclarations(
      { "example-capability": site({ publicationStatus: "internal_only" }) },
      manifestOf([
        entity({ publicationStatus: "candidate", allowedSurfaces: ["faq"] }),
      ])
    );
    expect(blocking(findings)).toEqual([]);
    expect(reported(findings).map((f) => f.kind)).toContain("site_more_restrictive_surfaces");
  });

  it("BLOQUE une capacité déclarée par le site et absente du manifeste", () => {
    const findings = compareDeclarations({ "ghost-capability": site() }, manifestOf([entity()]));
    expect(blocking(findings).map((f) => f.kind)).toEqual(["capability_absent_from_manifest"]);
  });

  it("ne recommande jamais de promotion", () => {
    const findings = compareDeclarations(
      { "example-capability": site() },
      manifestOf([entity({ publicationStatus: "candidate", allowedSurfaces: ["faq"] })])
    );
    for (const found of findings) {
      expect(found.message).not.toMatch(/devrait|should|promo/i);
    }
  });
});

describe("provenance — productSnapshotSha + evidenceRefs", () => {
  const manifest = manifestOf([
    entity({
      id: "alpha",
      evidence: [
        { id: "alpha-v1", commits: [], paths: ["a.ts"], tests: [], adrs: [] },
        { id: "alpha-v2", commits: [], paths: ["b.ts"], tests: [], adrs: [] },
      ],
    }),
    entity({ id: "beta", evidence: [{ id: "beta-v1", commits: [], paths: ["c.ts"], tests: [], adrs: [] }] }),
  ]);

  const input = (overrides: Partial<Parameters<typeof checkProvenance>[0]> = {}) => ({
    contentId: "faq/x",
    productSnapshotSha: SHA,
    evidenceRefs: ["alpha:alpha-v1"],
    capabilityIds: ["alpha"],
    ...overrides,
  });

  it("résout une provenance complète", () => {
    expect(isProven(checkProvenance(input(), manifest))).toBe(true);
  });

  it("EXIGE une preuve par capacité invoquée — ce qu'un commit unique ne pouvait garantir", () => {
    const check = checkProvenance(
      input({ capabilityIds: ["alpha", "beta"], evidenceRefs: ["alpha:alpha-v1"] }),
      manifest
    );
    expect(blockingProblems(check).map((p) => p.kind)).toContain("capability_without_evidence");
  });

  it("refuse une référence introuvable", () => {
    const check = checkProvenance(input({ evidenceRefs: ["alpha:inexistant"] }), manifest);
    expect(blockingProblems(check).map((p) => p.kind)).toContain("evidence_ref_unknown");
  });

  it("refuse une preuve étrangère aux capacités invoquées", () => {
    const check = checkProvenance(
      input({ evidenceRefs: ["alpha:alpha-v1", "beta:beta-v1"] }),
      manifest
    );
    expect(blockingProblems(check).map((p) => p.kind)).toContain(
      "evidence_ref_outside_declared_capabilities"
    );
  });

  it("rapporte sans bloquer un document rédigé contre un snapshot antérieur", () => {
    // Les identifiants de bundle sont stables par contrat : les références restent vérifiables.
    const check = checkProvenance(
      input({ productSnapshotSha: "1178684f78c4d6841f4e042527cc893c42d37254" }),
      manifest
    );
    expect(isProven(check)).toBe(true);
    expect(check.problems.map((p) => p.kind)).toContain("snapshot_mismatch");
  });
});

describe("état réel du dépôt", () => {
  const manifest = loadPinnedManifest(process.cwd());

  it("épingle un manifeste conforme à son checksum", () => {
    expect(manifest.snapshotCommit).toMatch(/^[0-9a-f]{40}$/);
    expect(manifest.productRepository).toBe("textos-v0");
  });

  it("le manifeste couvre tout le registre éditorial", () => {
    const known = new Set(manifest.entities.map((e) => e.id));
    for (const id of Object.keys(CAPABILITY_REGISTRY)) {
      expect(known.has(id)).toBe(true);
    }
  });

  it("connaît les six capacités Act et n'en revendique rien", () => {
    // « Le site connaît cette entité et n'en revendique rien » est une position tenue ; c'est une
    // information différente d'un angle mort (`capability_absent_from_registry`). L'inscription ne
    // doit accorder AUCUNE surface : c'est tout l'intérêt de la distinction.
    const ACT = [
      "grounded-truth-check",
      "structured-generation",
      "brief-fulfillment-check",
      "controlled-preview",
      "generation-handoff",
      "re-observation-plan",
    ];

    for (const id of ACT) {
      const declaration = findCapability(id);
      expect(declaration, id).toBeDefined();
      expect(declaration!.publicationStatus, id).toBe("internal_only");
      expect(declaration!.claimedSurfaces, id).toEqual([]);
      expect(isMarketable(declaration!), id).toBe(false);
    }

    const kinds = compareDeclarations(CAPABILITY_REGISTRY, manifest).map((f) => f.kind);
    expect(kinds).not.toContain("capability_absent_from_registry");
  });

  it("les cinq documents RÉELS portent le snapshot épinglé et résolvent leur provenance", () => {
    // Version précédente : elle fabriquait `productSnapshotSha: manifest.snapshotCommit`, donc ne
    // pouvait par construction jamais produire de mismatch. Elle ne lisait aucun fichier réel et
    // prouvait exactement rien — tout en prétendant verrouiller la décision éditoriale.
    //
    // Ici les documents sont chargés par le MÊME pipeline que les pages, et ce sont leurs valeurs
    // de frontmatter qui entrent dans la vérification. Un futur réimport qui bougerait le snapshot
    // sans relire les contenus fera donc réellement rougir ce test.
    const docs = routedCollections(process.cwd()).flatMap((collection) =>
      loadCollection(collection)
    );

    expect(docs).toHaveLength(5);

    for (const doc of docs) {
      const { productSnapshotSha, evidenceRefs, capabilityIds } = doc.frontmatter;

      expect(productSnapshotSha, `${doc.contentId} : snapshot du frontmatter`).toBe(
        manifest.snapshotCommit
      );

      const check = checkProvenance(
        { contentId: doc.contentId, productSnapshotSha, evidenceRefs, capabilityIds },
        manifest
      );

      expect(blockingProblems(check), doc.contentId).toEqual([]);
      expect(check.problems.map((p) => p.kind), doc.contentId).not.toContain("snapshot_mismatch");
      // Chaque capacité invoquée doit être adossée à au moins une preuve : c'est ce que
      // `capability_without_evidence` garantit, et il figure parmi les problèmes bloquants.
      expect(evidenceRefs.length, `${doc.contentId} : références de preuve`).toBeGreaterThanOrEqual(
        capabilityIds.length
      );
    }
  });

  it("aucune affirmation du site ne dépasse le produit", () => {
    expect(blocking(compareDeclarations(CAPABILITY_REGISTRY, manifest))).toEqual([]);
  });

  it("la migration supprime les faux écarts de l'ancien modèle", () => {
    const findings = compareDeclarations(CAPABILITY_REGISTRY, manifest);

    // Artefact du vocabulaire mono-axe : il ne doit plus jamais réapparaître.
    expect(findings.map((f) => f.kind)).not.toContain("product_ahead_implementation");

    // Les décisions non tracées, elles, ne sont PAS un faux écart : les six capacités Act n'ont
    // effectivement fait l'objet d'aucun arbitrage côté produit. Ce que la migration devait
    // supprimer, c'est l'absence de trace sur les DIX entités ratifiées le 2026-08-04.
    const RATIFIED = new Set([
      "observe-authority-presence",
      "direct-share-of-model",
      "indirect-mention-share",
      "total-authority-presence",
      "quality-ledger",
      "claim-evidence-layer",
      "opportunity-brief",
      "truth-check",
      "repos-intersection",
      "authority-score",
    ]);

    const untracedRatified = findings.filter(
      (f) => f.kind === "untraced_publication_decision" && RATIFIED.has(f.capabilityId)
    );
    expect(untracedRatified).toEqual([]);
  });

  it("prouve la provenance de la FAQ publiée", () => {
    const check = checkProvenance(
      {
        contentId: "faq/does-textos-automatically-verify-claims",
        productSnapshotSha: manifest.snapshotCommit,
        evidenceRefs: [
          "claim-evidence-layer:answer-evidence-capture-v1",
          "claim-evidence-layer:deterministic-claim-extraction-v1",
        ],
        capabilityIds: ["claim-evidence-layer"],
      },
      manifest
    );

    expect(isProven(check)).toBe(true);
    expect(check.prohibitedClaims).toContain("automatically verifies claims");
  });
});

describe("les surfaces gouvernent TOUTES les voies de publication", () => {
  const faqOnly = site({
    publicationStatus: "public_marketable",
    claimedSurfaces: ["faq"],
    label: "FAQ only",
  });

  it("une capacité public_marketable limitée à la FAQ n'atteint ni homepage ni featureList", () => {
    // Le trou que ces helpers ferment : `public_marketable` dit qu'une capacité PEUT être
    // commercialisée, jamais OÙ. La homepage et featureList ne lisaient que le statut.
    expect(isMarketable(faqOnly)).toBe(true);
    expect(isMarketableOn(faqOnly, "homepage")).toBe(false);
    expect(allowsSurface(faqOnly, "homepage")).toBe(false);
  });

  it("une capacité public_marketable sans sales_copy ne peut pas adosser un CTA", () => {
    expect(isMarketableOn(faqOnly, "sales_copy")).toBe(false);
  });

  it("observe-authority-presence reste commercialisable sur sales_copy", () => {
    const observe = findCapability("observe-authority-presence")!;
    expect(isMarketableOn(observe, "sales_copy")).toBe(true);
    expect(isMarketableOn(observe, "homepage")).toBe(true);
  });

  it("featureList n'expose que des capacités revendiquées en homepage", () => {
    for (const [, declaration] of Object.entries(CAPABILITY_REGISTRY)) {
      if (FEATURE_LIST.includes(declaration.label ?? "")) {
        expect(allowsSurface(declaration, "homepage")).toBe(true);
      }
    }
  });
});

describe("taxonomie des findings", () => {
  it("un écart de publication n'est jamais étiqueté comme un écart d'implémentation", () => {
    const findings = compareDeclarations(
      { "example-capability": site({ publicationStatus: "candidate", claimedSurfaces: ["faq"] }) },
      manifestOf([entity({ publicationStatus: "public_marketable", allowedSurfaces: ["faq"] })])
    );

    const kinds = findings.map((f) => f.kind);
    expect(kinds).toContain("site_more_restrictive_publication");
    expect(kinds).not.toContain("product_ahead_implementation");
    expect(blocking(findings)).toEqual([]);
  });

  it("BLOQUE quand le produit dit concept prohibé et le site capacité", () => {
    const findings = compareDeclarations(
      { "example-capability": site() },
      manifestOf([
        entity({
          kind: "prohibited_concept",
          implementationStatus: null,
          publicationStatus: "forbidden",
        }),
      ])
    );

    expect(blocking(findings).map((f) => f.kind)).toEqual(["entity_kind_divergence"]);
  });

  it("BLOQUE dans l'autre sens aussi", () => {
    const findings = compareDeclarations(
      {
        "example-capability": site({
          kind: "prohibited_concept",
          implementationStatus: null,
          publicationStatus: "forbidden",
        }),
      },
      manifestOf([entity()])
    );

    expect(blocking(findings).map((f) => f.kind)).toEqual(["entity_kind_divergence"]);
  });

  it("une divergence de nature court-circuite les comparaisons dérivées", () => {
    // Comparer les surfaces d'une « capacité » à celles d'un « concept prohibé » produirait des
    // écarts secondaires qui noieraient la seule incompatibilité qui compte.
    const findings = compareDeclarations(
      { "example-capability": site({ claimedSurfaces: [] }) },
      manifestOf([
        entity({
          kind: "prohibited_concept",
          implementationStatus: null,
          publicationStatus: "forbidden",
        }),
      ])
    );

    expect(findings).toHaveLength(1);
  });
});

describe("vocabulaire de surfaces — une seule source", () => {
  it("claims-registry ne redéfinit pas les surfaces, il les réexporte", () => {
    // Les littéraux existaient en deux exemplaires identiques. Une divergence y aurait été sournoise :
    // `status-axes` porte le vocabulaire confronté au manifeste produit, donc une surface ajoutée
    // d'un seul côté aurait fait accepter au site une valeur que le produit ignore — ou l'inverse.
    //
    // L'identité de RÉFÉRENCE est ce qui le prouve : deux tableaux au contenu égal passeraient un
    // `toEqual`, mais seul le même objet garantit qu'il n'existe pas de copie.
    expect(SURFACES).toBe(PUBLIC_SURFACES);
  });

  it("toute surface revendiquée par le registre existe dans ce vocabulaire", () => {
    for (const [id, declaration] of Object.entries(CAPABILITY_REGISTRY)) {
      for (const surface of declaration.claimedSurfaces) {
        expect(PUBLIC_SURFACES, `${id} : ${surface}`).toContain(surface);
      }
    }
  });
});
