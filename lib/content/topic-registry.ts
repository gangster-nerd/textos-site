// Registre TOPICS — taxonomie éditoriale visible pour la navigation lecteur. Distinct de la
// taxonomie de gouvernance (editorialClass) : les classes disent "quelle nature d'article"
// (product principle, architecture decision, …), les topics disent "de quel SUJET parle
// l'article" (authority observation, quality ledger, generation, gap typing, …).

import { z } from "zod";

export const TOPIC_IDS = [
  "authority-observation",
  "measurement-mechanics",
  "quality-ledger-and-provenance",
  "answer-surface-and-comparability",
  "claim-evidence-and-truth-check",
  "opportunity-and-decision",
  "generation-and-publication",
  "owned-surface",
  "product-doctrine",
  "how-we-build",
] as const;

export type TopicId = (typeof TOPIC_IDS)[number];

export const TopicSchema = z
  .object({
    id: z.enum(TOPIC_IDS),
    label: z.string().min(1),
    // Un slug de hub public. Optionnel — un topic n'a un hub que s'il porte une valeur
    // éditoriale unique. Voir §6 de CTC-ARTICLE-SYSTEM-1 : "Do not create indexable thin
    // tag pages. A topic hub becomes indexable only when it has sufficient unique editorial
    // value."
    hubSlug: z.string().regex(/^[a-z0-9-]+$/).optional(),
    // Court résumé de sujet, utilisé sur les hubs et en navigation.
    summary: z.string().min(1).max(240),
    // Ordre déterministe de présentation en navigation.
    order: z.number().int().nonnegative(),
  })
  .strict();

export type Topic = z.infer<typeof TopicSchema>;

const RAW: Record<TopicId, Topic> = {
  "authority-observation": {
    id: "authority-observation",
    label: "Authority observation",
    hubSlug: "authority-observation",
    summary:
      "What TextOS observes when an answer engine cites (or does not cite) your brand.",
    order: 10,
  },
  "measurement-mechanics": {
    id: "measurement-mechanics",
    label: "Measurement mechanics",
    hubSlug: "measurement-mechanics",
    summary:
      "How TextOS turns observations into reproducible Direct, Indirect and Total measures.",
    order: 20,
  },
  "quality-ledger-and-provenance": {
    id: "quality-ledger-and-provenance",
    label: "Quality ledger and provenance",
    hubSlug: "quality-ledger-and-provenance",
    summary: "Coverage, completeness, dispersion and the boundary between observed and inferred.",
    order: 30,
  },
  "answer-surface-and-comparability": {
    id: "answer-surface-and-comparability",
    label: "Answer surfaces and comparability",
    hubSlug: "answer-surface-and-comparability",
    summary:
      "One query, several surfaces. How TextOS scopes comparability across answer engines.",
    order: 40,
  },
  "claim-evidence-and-truth-check": {
    id: "claim-evidence-and-truth-check",
    label: "Claim evidence and TruthCheck",
    summary:
      "Extracting claims from Answer Evidence and gating what TextOS is willing to affirm.",
    order: 50,
  },
  "opportunity-and-decision": {
    id: "opportunity-and-decision",
    label: "Opportunity and decision",
    summary:
      "From authority gap to opportunity brief to human decision. Where the product actually wins.",
    order: 60,
  },
  "generation-and-publication": {
    id: "generation-and-publication",
    label: "Generation and publication",
    summary:
      "Grounded generation, graduated publication and the re-observation plan that follows.",
    order: 70,
  },
  "owned-surface": {
    id: "owned-surface",
    label: "Owned-surface observation",
    summary:
      "Observing your own site structure, without inventing intent or modifying it.",
    order: 80,
  },
  "product-doctrine": {
    id: "product-doctrine",
    label: "Product doctrine",
    summary:
      "Why TextOS is an authority observatory and not an AI SEO score.",
    order: 90,
  },
  "how-we-build": {
    id: "how-we-build",
    label: "How we build",
    summary:
      "Engineering practice, governance and internal tooling behind TextOS.",
    order: 100,
  },
};

export const TOPICS: Record<TopicId, Topic> = Object.fromEntries(
  Object.entries(RAW).map(([k, v]) => [k, TopicSchema.parse(v)]),
) as Record<TopicId, Topic>;

export function findTopic(id: string): Topic | undefined {
  return (TOPICS as Record<string, Topic>)[id];
}

/** Ordre déterministe (utilisé pour construire la nav et les hubs). */
export const TOPICS_ORDERED: Topic[] = Object.values(TOPICS).sort(
  (a, b) => a.order - b.order || a.id.localeCompare(b.id),
);

/** Set de sujets qui ont un hub publiable (URL /insights/topic/<hubSlug>). */
export const HUB_TOPIC_IDS: TopicId[] = TOPICS_ORDERED.filter((t) => t.hubSlug).map(
  (t) => t.id,
);
