// Fixture de la mesure DE DÉPART — l'état « avant » de la chaîne d'accueil.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// POURQUOI UNE SECONDE FIXTURE, ET NON DES CHIFFRES DANS LE COMPOSANT
//
// La section d'accueil « From absent to cited » affirme une chose et une seule : la présence a
// augmenté, mesurée sur le MÊME instrument. Deux nombres écrits à la main dans un composant
// pourraient dériver l'un de l'autre au premier ajustement esthétique, et la section continuerait
// d'affirmer une progression que plus rien ne soutient.
//
// Ici, le panel n'est pas redéclaré : sa taille, son nombre d'observées, ses non observables et sa
// version sont LUS depuis `example-measurement.ts`. Changer le panel d'un côté le change des deux.
// Seuls les comptes de départ sont déclarés, et l'union est dérivée, comme dans la fixture de
// mesure. Les invariants sont vérifiés au chargement : un « avant » incohérent casse le build
// plutôt que d'atteindre la page.
//
// LA GRILLE EST DÉRIVÉE DES COMPTES. `buildPanelCells` place les cellules à partir des comptes,
// jamais l'inverse : l'image ne peut pas montrer sept requêtes citées quand la mesure en annonce
// six. Une doctrine ne se tient pas en texte si le dessin à côté la contredit.
// ─────────────────────────────────────────────────────────────────────────────────────────────

import { exampleMeasurement } from "@/lib/fixtures/example-measurement";

const RAW = {
  /** Requêtes où la marque est citée directement, au départ. */
  directCount: 2,
  /** Requêtes où la marque est mentionnée indirectement, au départ. */
  indirectCount: 5,
  /** Requêtes comptées dans les deux — la raison pour laquelle le total n'est pas une somme. */
  overlapCount: 1,
} as const;

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Fixture de départ incohérente : ${message}`);
}

const totalCount = RAW.directCount + RAW.indirectCount - RAW.overlapCount;

assert(RAW.overlapCount > 0, "sans recouvrement, l'union serait une somme et l'exemple se contredirait.");
assert(
  RAW.overlapCount <= Math.min(RAW.directCount, RAW.indirectCount),
  "le recouvrement ne peut pas dépasser le plus petit des deux ensembles."
);
assert(
  totalCount < RAW.directCount + RAW.indirectCount,
  "le total doit être une union, donc strictement inférieur à la somme."
);
assert(totalCount <= exampleMeasurement.observed, "le total ne peut pas dépasser les requêtes observées.");
// L'affirmation de toute la section. Si elle tombe, la section ment.
assert(
  totalCount < exampleMeasurement.totalCount,
  "la présence de départ doit être strictement inférieure à la présence mesurée ensuite, sinon la chaîne n'a rien à montrer."
);

const share = (count: number) => Math.round((count / exampleMeasurement.observed) * 1000) / 10;

export const baselineMeasurement = {
  ...RAW,
  // Le panel n'est pas redéclaré : c'est le même instrument, lu à sa source.
  panelVersion: exampleMeasurement.panelVersion,
  queriesInPanel: exampleMeasurement.queriesInPanel,
  observed: exampleMeasurement.observed,
  notObservable: exampleMeasurement.notObservable,
  totalCount,
  naiveSum: RAW.directCount + RAW.indirectCount,
  directShare: share(RAW.directCount),
  indirectShare: share(RAW.indirectCount),
  totalShare: share(totalCount),
  /** Requêtes observées sans aucune mention — ce que l'étape « Locate » nomme. */
  noMentionCount: exampleMeasurement.observed - totalCount,
} as const;

export type PanelCellKind = "direct" | "indirect" | "none" | "not-observable";

/**
 * Place les cellules du panel à partir des comptes, de façon déterministe.
 *
 * Le pas de 7 sur 48 cases est premier avec 48 : il parcourt donc les 48 positions sans jamais
 * repasser deux fois au même endroit. On obtient une dispersion régulière et STABLE d'un rendu à
 * l'autre — un aléa donnerait une image différente à chaque build, donc une capture de
 * non-régression impossible à comparer.
 */
export function buildPanelCells(): PanelCellKind[] {
  const { queriesInPanel, directCount, indirectCount, overlapCount, notObservable } =
    baselineMeasurement;

  // Le recouvrement est compté une fois à l'image : une case citée des deux façons reste UNE
  // requête. On la rend comme une citation directe, la plus forte des deux.
  const indirectOnly = indirectCount - overlapCount;

  const cells: PanelCellKind[] = new Array(queriesInPanel).fill("none");
  let cursor = 0;
  const place = (kind: PanelCellKind, count: number) => {
    for (let i = 0; i < count; i += 1) {
      cursor = (cursor + 7) % queriesInPanel;
      while (cells[cursor] !== "none") cursor = (cursor + 1) % queriesInPanel;
      cells[cursor] = kind;
    }
  };

  place("direct", directCount);
  place("indirect", indirectOnly);
  place("not-observable", notObservable);

  return cells;
}

const cells = buildPanelCells();
const count = (kind: PanelCellKind) => cells.filter((cell) => cell === kind).length;

assert(cells.length === baselineMeasurement.queriesInPanel, "la grille doit couvrir tout le panel.");
assert(
  count("direct") + count("indirect") === baselineMeasurement.totalCount,
  "les cellules présentes doivent valoir exactement l'union annoncée — sinon l'image contredit la mesure."
);
assert(
  count("not-observable") === baselineMeasurement.notObservable,
  "les non observables dessinés doivent valoir ceux de la mesure."
);
assert(
  count("none") === baselineMeasurement.noMentionCount,
  "les requêtes sans mention dessinées doivent valoir celles que l'étape « Locate » nomme."
);

export type BaselineMeasurementView = typeof baselineMeasurement;
