// Sous-ensemble EXÉCUTABLE du capability-registry, au strict minimum requis par la homepage.
// Source de vérité doctrinale : capability-registry.spec.md (§0, §4).

export type Status =
  | "implemented"
  | "implemented_schema_only"
  | "wip_committed_tested"
  | "public_marketable"
  | "planned"
  | "candidate"
  | "risky"
  | "unsupported"
  | "forbidden";

// Verrou central (spec §0.2) : la marketabilité n'est jamais dérivée d'un état de build seul.
export const isMarketable = (s: Status): boolean => s === "public_marketable";

// Statuts des capacités citées par la homepage (spec §4).
export const CAPABILITY_STATUS = {
  "observe-authority-presence": "public_marketable",
  "direct-share-of-model": "public_marketable",
  "indirect-mention-share": "public_marketable",
  "total-authority-presence": "public_marketable",
  "quality-ledger": "public_marketable",
  "claim-evidence-layer": "wip_committed_tested",
  "opportunity-brief": "planned",
  "truth-check": "planned",
  "repos-intersection": "planned",
  "authority-score": "forbidden",
} as const satisfies Record<string, Status>;

export type CapabilityId = keyof typeof CAPABILITY_STATUS;

// Libellés publics des capacités public_marketable (schema-map.spec.md §4).
export const CAPABILITY_LABELS: Partial<Record<CapabilityId, string>> = {
  "observe-authority-presence": "Authority Presence measurement",
  "direct-share-of-model": "Direct Share of Model",
  "indirect-mention-share": "Indirect Mention Share",
  "total-authority-presence": "Total Authority Presence",
  "quality-ledger": "Measurement quality ledger",
};

const ALL_IDS = Object.keys(CAPABILITY_STATUS) as CapabilityId[];

// featureList = uniquement public_marketable (verrou entity-graph §3 / schema-map §4).
export const FEATURE_LIST: string[] = ALL_IDS.filter((id) =>
  isMarketable(CAPABILITY_STATUS[id]),
).map((id) => CAPABILITY_LABELS[id] ?? id);

// Assertion de garde (spec §4) : toute capacité public_marketable a un libellé public.
for (const id of ALL_IDS) {
  if (isMarketable(CAPABILITY_STATUS[id]) && !CAPABILITY_LABELS[id]) {
    throw new Error(`Capacité "${id}" public_marketable sans libellé public.`);
  }
}
