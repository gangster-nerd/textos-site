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
];

export function findClaim(id: string): Claim | undefined {
  return CLAIMS.find((c) => c.id === id);
}
