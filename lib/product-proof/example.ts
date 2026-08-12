// Fixture du Product Proof — CE DE QUOI UNE OBSERVATION EST FAITE.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// CE QUE CETTE FIXTURE EST, ET CE QU'ELLE N'EST PAS
//
// `proofKind: "illustrative"` — valeurs inventées, rendues dans la STRUCTURE de preuve réelle du
// produit (textos-v0 @ designSnapshotSha : Answers → Evidence → Provenance). La structure vient du
// produit ; les données, non. La surface le dit en clair, et rien ici ne doit laisser croire à un
// run exécuté, un provider appelé, un client mesuré.
//
// Le jour où une observation publique réelle remplacera celle-ci, seul ce module change : la
// structure, les composants et la narration restent. C'est tout l'intérêt de figer la forme
// maintenant — le prochain saut de crédibilité sera un changement de DONNÉE et de PROVENANCE, pas
// une reconstruction de la page.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// TROIS FAITS DISTINCTS, C'EST LE CŒUR PÉDAGOGIQUE
//
//   1. réponse capturée + citations        → la mesure a de quoi s'appuyer
//   2. réponse capturée + ZÉRO citation    → `no_citations`, un décompte réel de zéro
//   3. aucune surface de réponse           → rien à compter : la cellule n'est pas `0`, elle est vide
//
// (2) et (3) sont les deux erreurs classiques qu'on refuse de commettre : « sans citation » n'est
// pas « non observable », et une absence n'est pas un zéro. Les invariants en bas de fichier
// cassent le build si la fixture cesse de porter ces trois cas.
//
// AUCUN ÉTAT AMBRE OU ROUGE : `rate_limited`, `timeout`, `provider_error` sont exclus. Ce n'est pas
// un catalogue d'erreurs, et leurs valeurs sombres ne sont pas ratifiées (cf. public-vocabulary).
// ─────────────────────────────────────────────────────────────────────────────────────────────

import {
  NEUTRAL_OBSERVATION_STATUSES,
  type CitationKind,
  type NeutralObservationStatus,
} from "./public-vocabulary";

/**
 * Origine du CONTRAT VISUEL et documentaire repris, ratifié en Commit A
 * (docs/design/public-surface-baseline.md §1).
 *
 * À ne pas confondre avec `snapshotCommit` (product-manifest/), qui gouverne les CAPACITÉS et leur
 * droit de publication. L'existence d'une UI Answers/Evidence dans le produit n'ajoute AUCUNE
 * capacité publique : cette surface reprend une grammaire, elle ne déclare rien.
 */
export const DESIGN_SNAPSHOT_SHA = "2f86435e9c7d77bded39021a542937ad6b3382fc";

/** Réponse capturée, ou absente. Jamais une chaîne vide qui ferait passer l'un pour l'autre. */
export type ProofAnswer = { kind: "captured"; text: string } | { kind: "absent" };

export interface ProofObservation {
  /** Clé de rendu. Volontairement lisible et court : ce n'est pas un identifiant de run. */
  ref: string;
  query: string;
  status: NeutralObservationStatus;
  answer: ProofAnswer;
  /**
   * Nombre de citations RÉELLEMENT dénombrées. `null` quand il n'y avait rien à dénombrer — pas
   * de surface de réponse, donc pas de zéro à écrire. `0` reste un décompte, `null` une absence.
   */
  citationCount: number | null;
}

export interface ProofCitation {
  kind: CitationKind;
  /** Domaine FICTIF. Le TLD `.example` est réservé à la documentation (RFC 2606) : il ne peut pas
   *  être pris pour une vraie source, et il n'est joignable par personne. */
  sourceDomain: string;
  snippet: string;
}

/**
 * Provenance PUBLIQUE — quatre axes lisibles. Volontairement sans run id, sans observation id,
 * sans hash : un identifiant inventé serait un faux identifiant, et un hash inventé du théâtre.
 * Ce qui compte publiquement est que la mesure soit DATÉE, VERSIONNÉE et RATTACHÉE à un instrument.
 */
export interface ProofProvenance {
  panel: string;
  engineSurface: string;
  methodVersion: string;
  observedAt: string;
}

export interface ProductProofExample {
  proofKind: "illustrative";
  designSnapshotSha: string;
  observations: readonly ProofObservation[];
  /** L'observation développée en Evidence. Rattachée par sa `ref`, jamais dupliquée. */
  evidence: {
    observationRef: string;
    citations: readonly ProofCitation[];
    provenance: ProofProvenance;
  };
}

const EXAMPLE: ProductProofExample = {
  proofKind: "illustrative",
  designSnapshotSha: DESIGN_SNAPSHOT_SHA,

  observations: [
    {
      ref: "a",
      query: "which records-retention tools publish an independent security audit",
      status: "ok",
      answer: {
        kind: "captured",
        text:
          "Several vendors publish independent audit reports. Northwind Analytics links its current " +
          "report in full, naming the auditor. Meridian Archive publishes a summary and provides the " +
          "full report on request.",
      },
      citationCount: 2,
    },
    {
      ref: "b",
      query: "how do small teams choose a records-retention tool",
      status: "no_citations",
      answer: {
        kind: "captured",
        text:
          "Teams usually weigh retention rules, export formats and administrative overhead, then " +
          "shortlist two or three vendors before running a pilot.",
      },
      // Une réponse a bien été capturée, et elle ne cite rien. Zéro est ici un DÉCOMPTE.
      citationCount: 0,
    },
    {
      ref: "c",
      query: "records-retention tool pricing for teams under fifty people",
      status: "no_answer_surface",
      answer: { kind: "absent" },
      // Rien n'a été capturé : il n'y a pas de citations à compter. Ce n'est pas zéro.
      citationCount: null,
    },
  ],

  evidence: {
    observationRef: "a",
    citations: [
      {
        kind: "direct",
        sourceDomain: "northwind-analytics.example",
        snippet: "Our current independent audit report is published in full, with the auditor named.",
      },
      {
        // La marque suivie n'est pas la source citée : elle est NOMMÉE dans une source citée.
        // C'est exactement la différence Direct / Indirect que la méthodologie explique.
        kind: "indirect_mention",
        sourceDomain: "sector-review.example",
        snippet:
          "Northwind Analytics is one of the few vendors publishing the full report rather than a summary.",
      },
    ],
    provenance: {
      panel: "buyer-questions · v3 · en",
      engineSurface: "answer-engine · answer-with-sources",
      methodVersion: "authority-presence v2",
      observedAt: "2026-08-11",
    },
  },
};

// ── Invariants — un exemple incohérent casse le build plutôt que d'atteindre la page ───────────

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Fixture Product Proof incohérente : ${message}`);
}

const byRef = new Map(EXAMPLE.observations.map((o) => [o.ref, o]));

assert(EXAMPLE.proofKind === "illustrative", "la preuve publique est illustrative, et rien d'autre.");

assert(
  EXAMPLE.observations.every((o) =>
    (NEUTRAL_OBSERVATION_STATUSES as readonly string[]).includes(o.status)
  ),
  "un statut hors tonalité neutre exigerait une couleur d'état non ratifiée."
);

const detailed = byRef.get(EXAMPLE.evidence.observationRef);
assert(detailed !== undefined, "l'Evidence doit se rattacher à une observation de la table.");
assert(
  detailed!.citationCount === EXAMPLE.evidence.citations.length,
  "le décompte de citations de la ligne doit être celui des citations développées."
);

assert(
  EXAMPLE.observations.some((o) => o.answer.kind === "captured" && (o.citationCount ?? 0) > 0),
  "il faut une observation citée : sans elle, la preuve ne montre pas de quoi la mesure s'appuie."
);
assert(
  EXAMPLE.observations.some((o) => o.answer.kind === "captured" && o.citationCount === 0),
  "il faut une réponse capturée SANS citation : c'est le cas qui distingue « no citation » d'une absence."
);
assert(
  EXAMPLE.observations.some((o) => o.answer.kind === "absent" && o.citationCount === null),
  "il faut une absence de réponse SANS décompte : une absence rendue `0` serait un faux zéro."
);
assert(
  EXAMPLE.observations.every((o) => o.answer.kind !== "absent" || o.citationCount === null),
  "une réponse non capturée ne peut pas porter un décompte de citations."
);

assert(
  EXAMPLE.evidence.citations.every((c) => c.sourceDomain.endsWith(".example")),
  "toute source citée doit être un domaine `.example` : une source d'apparence réelle serait une fausse preuve."
);
assert(
  new Set(EXAMPLE.evidence.citations.map((c) => c.kind)).size > 1,
  "les citations doivent montrer au moins deux genres : c'est la distinction direct / indirect."
);

export const productProofExample = EXAMPLE;
