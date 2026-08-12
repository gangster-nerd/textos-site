// LOCALISATION PRODUIT → SURFACE PUBLIQUE.
//
// Le produit rend ses statuts d'observation et ses genres de citation EN FRANÇAIS (textos-v0 @
// 2f86435 — src/components/answers/observation-status.tsx, src/components/evidence/
// citation-evidence-row.tsx). La surface publique est anglaise. Traduire au fil du JSX produirait
// autant de traductions que de composants, et la première divergence serait invisible.
//
// Ce module est la SEULE source de ces libellés. Le tableau est enregistré dans
// docs/design/public-surface-baseline.md §11 — il fait partie du contrat de convergence, pas d'un
// composant.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// POURQUOI SEULEMENT LES STATUTS NEUTRES
//
// Le produit range ses huit statuts en trois tonalités : neutre, `partial` (ambre), `failure`
// (rouge). Commit A a ratifié les NOMS `status-pending` / `status-failure` mais a laissé leurs
// VALEURS non résolues : le produit diffère son mode sombre, le site n'a ni ambre ni rouge, et en
// inventer serait prendre à la place du produit une décision qu'il a ajournée.
//
// Conséquence tenue ici : la surface publique ne localise que les quatre statuts NEUTRES. Les
// quatre autres (`rate_limited`, `timeout`, `provider_empty_response`, `provider_error`) ne sont
// pas traduits parce qu'ils ne sont pas rendables — pas parce qu'ils n'existent pas. Le jour où
// une surface publique en aura besoin, il faudra d'abord faire ratifier les deux valeurs sombres.
// ─────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Statuts d'observation de tonalité NEUTRE (textos-v0 : `ok`, `no_citations`, `no_answer_surface`,
 * `skipped` — « quatre issues mécaniques légitimes »). Ce sont les seuls que la surface publique
 * peut rendre sans couleur d'état.
 */
export const NEUTRAL_OBSERVATION_STATUSES = [
  "ok",
  "no_citations",
  "no_answer_surface",
  "skipped",
] as const;

export type NeutralObservationStatus = (typeof NEUTRAL_OBSERVATION_STATUSES)[number];

/**
 * `no_citations` dit qu'une réponse A ÉTÉ CAPTURÉE et qu'elle ne cite rien. Il ne dit PAS que la
 * dimension n'était pas observable — ce sont deux faits différents, et les confondre serait une
 * régression sémantique. Aucun libellé ci-dessous ne contient « not observable ».
 */
export const OBSERVATION_STATUS_LABEL: Record<NeutralObservationStatus, string> = {
  ok: "OK",
  no_citations: "No citation",
  no_answer_surface: "Answer surface not triggered",
  skipped: "Skipped",
};

/** `unknown` reste « Undetermined », JAMAIS « third party » : le schéma ne prouve pas l'origine. */
export const CITATION_KIND_LABEL = {
  direct: "Direct source",
  indirect_mention: "Indirect mention",
  unknown: "Undetermined",
} as const;

export type CitationKind = keyof typeof CITATION_KIND_LABEL;

/** Réponse non capturée — une absence OBSERVÉE, jamais un échec, jamais un zéro. */
export const ANSWER_NOT_CAPTURED_LABEL = "Answer not captured";

/**
 * Cellule sans valeur applicable. Réutilise le tiret cadratin déjà employé par le panneau de
 * mesure : « pas de valeur à rapporter ici », par opposition à un `0` qui affirmerait un décompte.
 */
export const NOT_APPLICABLE_LABEL = "—";
