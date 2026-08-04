export type Surface =
  | "developer_note"
  | "changelog"
  | "faq"
  | "product_article"
  | "homepage"
  | "pricing"
  | "sales_copy";

export type Claim = {
  id: string;
  capabilityId: string | null;
  statement: string;
  evidenceRefs: string[];
  allowedSurfaces: Surface[];
};

const S8_SURFACES: Surface[] = ["developer_note", "changelog", "faq"];
// Surface COMMERCIALE, et elle SEULE. Ces claims dérivent de la copy homepage, mais ça ne justifie
// pas de les ouvrir aux surfaces éditoriales : HP1/HP2 continuent de gouverner la doctrine publique,
// ces claims-ci gouvernent uniquement la proposition commerciale. Deux registres de discours.
const SALES_ONLY: Surface[] = ["sales_copy"];
const DOCTRINE_SURFACES: Surface[] = [
  "developer_note",
  "changelog",
  "faq",
  "product_article",
  "homepage",
];

export const CLAIMS: readonly Claim[] = [
  // --- Claim Evidence Layer (S8) — wip_committed_tested ---
  {
    id: "s8-answer-evidence-capture",
    capabilityId: "claim-evidence-layer",
    statement:
      "TextOS has a committed and tested technical foundation for capturing Answer Evidence.",
    evidenceRefs: ["textos-v0@1178684"],
    allowedSurfaces: S8_SURFACES,
  },
  {
    id: "s8-deterministic-extraction",
    capabilityId: "claim-evidence-layer",
    statement: "Claim extraction from Answer Evidence is deterministic.",
    evidenceRefs: ["textos-v0@1178684"],
    allowedSurfaces: S8_SURFACES,
  },
  {
    id: "s8-no-automatic-verification",
    capabilityId: "claim-evidence-layer",
    statement:
      "TextOS does not automatically verify whether extracted claims are true. The layer captures and extracts; it does not judge truth.",
    evidenceRefs: ["ADR-PENDING-VERIFICATION"],
    allowedSurfaces: S8_SURFACES,
  },

  // --- Doctrine publique (homepage) — ratifiée ---
  {
    id: "hp1-measurement-doctrine",
    capabilityId: null,
    statement:
      "TextOS measures authority presence reproducibly on a versioned query panel, with dispersion and completeness. Not a score. A measurement.",
    evidenceRefs: ["homepage"],
    allowedSurfaces: DOCTRINE_SURFACES,
  },
  {
    id: "hp2-metric-integrity",
    capabilityId: null,
    statement:
      "Direct, Indirect and Total are separate measures. Total Authority Presence is the union of direct and indirect presence, never their sum. A signal that is not observable is reported as not observable, never zero.",
    evidenceRefs: ["homepage"],
    allowedSurfaces: DOCTRINE_SURFACES,
  },

  // --- Claims COMMERCIAUX (S2.0A) — surface sales_copy ---
  //
  // Rattachés à `observe-authority-presence` (libellé public : « Authority Presence measurement »),
  // seule capacité que le CTA `measurement_request` engage. Les quatre autres capacités publiques
  // auront leurs propres claims commerciaux en S3, quand les pages de méthodologie fourniront leur
  // formulation exacte — on n'invente pas aujourd'hui des descriptions non approuvées.
  //
  // HP1/HP2 restent hors de cet ensemble : `capabilityId: null` les rend inutilisables pour un CTA
  // (le gate exige que chaque claim appartienne aux requiredCapabilities). Doctrine éditoriale
  // d'un côté, proposition commerciale de l'autre — on ne leur attribue pas une capacité pour
  // contourner le gate, et on ne relâche pas le gate.
  {
    id: "sales-authority-presence-measurement",
    capabilityId: "observe-authority-presence",
    statement: "TextOS measures how AI answer engines cite your brand.",
    evidenceRefs: ["homepage-approved-copy"],
    allowedSurfaces: SALES_ONLY,
  },
  {
    id: "sales-versioned-authority-measurement",
    capabilityId: "observe-authority-presence",
    statement:
      "TextOS measures a brand's authority presence reproducibly, on a versioned query panel, with dispersion and completeness.",
    evidenceRefs: ["homepage-approved-copy"],
    allowedSurfaces: SALES_ONLY,
  },
  {
    // RATIFIÉ PAR LE PO (2026-08-04) dans cette formulation exacte. « current » empêche d'en faire
    // une vérité éternelle sur le produit ; « does not include » décrit l'offre actuelle sans
    // suggérer que TextOS ne pourra jamais proposer d'autres couches.
    id: "sales-authority-presence-boundaries",
    capabilityId: "observe-authority-presence",
    statement:
      "TextOS's current Authority Presence measurement is not a score and does not include recommendations, ROI estimates, or guarantees of ranking or AI citation.",
    evidenceRefs: ["homepage-approved-copy", "public-product-refusals"],
    allowedSurfaces: SALES_ONLY,
  },
];

export function findClaim(id: string): Claim | undefined {
  return CLAIMS.find((c) => c.id === id);
}
