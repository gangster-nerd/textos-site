// Registre visuel — champs MINIMAUX seulement, validés par Zod au chargement.
//
// Un registre à un seul asset ne révèle pas les champs dont il aura besoin plus tard : PAS de
// sourceRefs, aboutEntities ni validForCapabilityStatuses tant qu'un second asset ne les justifie.
//
// Zod plutôt que de simples types : un asset sans alt / caption / claimIds doit provoquer une
// erreur au RUNTIME (donc au build), pas seulement un rouge dans l'éditeur. Un visuel non décrit
// n'est pas accessible ; un visuel non attribué n'a pas de provenance. Ni l'un ni l'autre ne se
// publie.

import { z } from "zod";

import { CONTENT_TYPES } from "@/lib/content/content-types";

export const VISUAL_IDS = [
  "epistemic-layers-v1",
  "authority-presence-union-v1",
  "observability-states-v1",
] as const;

export type VisualId = (typeof VISUAL_IDS)[number];
export type VisualStatus = "approved" | "disabled" | "retired";

export const VisualAssetSchema = z
  .object({
    id: z.enum(VISUAL_IDS),
    version: z.number().int().positive(),
    status: z.enum(["approved", "disabled", "retired"]),
    // Chemin relatif servi depuis /public. Jamais d'URL absolue : l'origine est provisoire.
    src: z.string().regex(/^\/[^\s]+$/, "src doit être un chemin absolu local (/…)"),
    alt: z.string().trim().min(1, "un visuel sans alt n'est pas publiable (accessibilité)"),
    caption: z.string().trim().min(1, "un visuel sans caption n'est pas publiable"),
    claimIds: z
      .array(z.string().min(1))
      .min(1, "un visuel sans claimIds n'a pas de provenance"),
    allowedContentTypes: z.array(z.enum(CONTENT_TYPES)).min(1),
  })
  .strict();

export type VisualAsset = z.infer<typeof VisualAssetSchema>;

export const VisualRegistrySchema = z.record(z.enum(VISUAL_IDS), VisualAssetSchema);

const RAW_VISUALS = {
  "epistemic-layers-v1": {
    id: "epistemic-layers-v1",
    version: 1,
    status: "approved",
    src: "/diagrams/epistemic-layers-v1.svg",
    alt: "Four layers left to right — Observation, Extraction, Verification, Judgement. A dashed boundary encloses Observation and Extraction, marking the current Claim Evidence Layer scope; Verification and Judgement fall outside it.",
    caption:
      "The Claim Evidence Layer currently covers observation and extraction. Verification and judgement are separate layers.",
    claimIds: [
      "s8-answer-evidence-capture",
      "s8-deterministic-extraction",
      "s8-no-automatic-verification",
    ],
    allowedContentTypes: ["faq_entry"],
  },
  "authority-presence-union-v1": {
    id: "authority-presence-union-v1",
    version: 1,
    status: "approved",
    src: "/diagrams/authority-presence-union-v1.svg",
    alt: "Two overlapping circles. The left circle is Direct Share of Model — observations where the brand is cited as a source. The right circle is Indirect Mention Share — observations where the brand is named in the answer text, regardless of citation. They overlap: an observation can be both. Total Authority Presence is the whole area covered by either circle, counted once, so it is never the sum of the two shares.",
    caption:
      "Total Authority Presence is the union of direct and indirect presence. An observation in the overlap belongs to Total once, never twice.",
    claimIds: ["m2-direct-share-of-model", "m3-indirect-mention-share", "m4-total-is-a-union"],
    allowedContentTypes: ["product_article"],
  },
  "observability-states-v1": {
    id: "observability-states-v1",
    version: 1,
    status: "approved",
    src: "/diagrams/observability-states-v1.svg",
    alt: "Four separate states side by side. Observed positive is a filled bar on a baseline. Observed zero is an empty bar on a baseline — the engine answered and the brand was absent. Not observable is a dashed frame with a dash inside and no baseline at all — no measurement exists. Incomplete observation is a dashed frame partially filled — too few observations to report. Observed zero and not observable are drawn differently on purpose.",
    caption:
      "Observability status, one of the five ledger dimensions. Observed zero is a measurement; not observable is the absence of one. They are never drawn, stored or reported the same way.",
    claimIds: ["m5-not-observable-is-not-zero", "m6-quality-ledger-contextualises"],
    allowedContentTypes: ["product_article"],
  },
} satisfies Record<VisualId, unknown>;

/** Registre validé. Un asset mal formé échoue ICI, au chargement — donc au build. */
export const VISUALS = VisualRegistrySchema.parse(RAW_VISUALS) as Record<
  VisualId,
  VisualAsset
>;

export function getVisual(id: string): VisualAsset | undefined {
  return VISUALS[id as VisualId];
}
