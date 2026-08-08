// Fixture du panneau de mesure de la page d'accueil.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// POURQUOI CES CHIFFRES SONT DÉRIVÉS, ET NON SAISIS
//
// Un panneau d'exemple qui montrerait `Total = Direct + Indirect` contredirait, en image, la
// doctrine que la page affirme en texte. Les valeurs saisies à la main dérivent : on ajuste un
// chiffre pour l'esthétique et l'exemple devient faux sans que personne ne le voie.
//
// Seuls les COMPTES bruts sont déclarés ici. Les pourcentages, l'union et la complétude sont
// calculés, et les invariants sont vérifiés au chargement du module — un exemple incohérent casse
// le build plutôt que d'atteindre la page.
//
// DEUX INVARIANTS NON NÉGOCIABLES :
//   · le panel contient des requêtes NON OBSERVABLES — une mesure sans trou serait un mensonge
//     visuel, et la doctrine dit précisément qu'un non-observable n'est pas un zéro ;
//   · le total est une UNION, donc strictement inférieur à la somme dès qu'il y a recouvrement.
//
// Ce module est le seul endroit à changer le jour où une mesure réelle remplacera l'exemple. Le
// composant ne connaît que la forme, jamais les valeurs.
// ─────────────────────────────────────────────────────────────────────────────────────────────

export interface ExampleMeasurement {
  /** Étiquette du panel de requêtes — versionné, comme le dit la doctrine. */
  panelVersion: string;
  queriesInPanel: number;
  observed: number;
  notObservable: number;
  /** Requêtes où la marque est citée directement. */
  directCount: number;
  /** Requêtes où la marque est mentionnée indirectement (source citée, pas la marque). */
  indirectCount: number;
  /** Requêtes comptées dans les deux — la raison pour laquelle le total n'est pas une somme. */
  overlapCount: number;
  /** Étendue observée du total sur les exécutions répétées du même panel. */
  dispersionLabel: string;
  runs: number;
}

const RAW: ExampleMeasurement = {
  panelVersion: "v3",
  queriesInPanel: 48,
  observed: 43,
  notObservable: 5,
  directCount: 12,
  indirectCount: 9,
  overlapCount: 4,
  dispersionLabel: "15–19",
  runs: 3,
};

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Fixture de mesure incohérente : ${message}`);
}

assert(
  RAW.observed + RAW.notObservable === RAW.queriesInPanel,
  "observé + non observable doit égaler la taille du panel."
);
assert(RAW.notObservable > 0, "un panel sans requête non observable serait un mensonge visuel.");
assert(
  RAW.overlapCount > 0,
  "sans recouvrement, l'union serait égale à la somme et l'exemple contredirait la doctrine."
);
assert(
  RAW.overlapCount <= Math.min(RAW.directCount, RAW.indirectCount),
  "le recouvrement ne peut pas dépasser le plus petit des deux ensembles."
);

const totalCount = RAW.directCount + RAW.indirectCount - RAW.overlapCount;

assert(totalCount <= RAW.observed, "le total ne peut pas dépasser le nombre de requêtes observées.");
assert(
  totalCount < RAW.directCount + RAW.indirectCount,
  "le total doit être une union, donc strictement inférieur à la somme."
);

const share = (count: number) => Math.round((count / RAW.observed) * 1000) / 10;

export const exampleMeasurement = {
  ...RAW,
  totalCount,
  /** Somme naïve, exposée UNIQUEMENT pour montrer qu'elle n'est pas le total. */
  naiveSum: RAW.directCount + RAW.indirectCount,
  directShare: share(RAW.directCount),
  indirectShare: share(RAW.indirectCount),
  totalShare: share(totalCount),
  completeness: Math.round((RAW.observed / RAW.queriesInPanel) * 1000) / 10,
} as const;

export type ExampleMeasurementView = typeof exampleMeasurement;
