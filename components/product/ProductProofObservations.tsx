import type { ProofObservation } from "@/lib/product-proof/example";
import {
  ANSWER_NOT_CAPTURED_LABEL,
  NOT_APPLICABLE_LABEL,
  OBSERVATION_STATUS_LABEL,
} from "@/lib/product-proof/public-vocabulary";

/**
 * Les observations d'un run, dans la grammaire réelle du produit : Query · Status · Answer · Cit. ·
 * Evidence (textos-v0 @ 2f86435, src/components/answers/answers-table.tsx).
 *
 * DOCUMENTAIRE, PAS APPLICATIF. Dans le produit, chaque ligne porte un lien vers son Evidence et la
 * ligne courante est marquée. Ici il n'y a rien à actionner : ni lien, ni survol, ni ligne
 * sélectionnée, ni `aria-current`, ni chevron. Un état sélectionné sans sélection possible serait
 * du faux chrome applicatif. Le lien entre une ligne et l'Evidence développée plus bas est porté
 * par le TEXTE (« Shown below ») et par l'ordre de lecture, pas par une interaction simulée.
 *
 * MOBILE : la table devient une pile d'observations étiquetées (voir globals.css). Cinq colonnes
 * dont deux de prose ne tiennent pas dans 245 px — les compresser reproduirait le défaut constaté
 * sur le panneau Authority Presence, où l'en-tête de colonne finissait coupé. Les rôles ARIA sont
 * explicites parce que `display: block` retire sinon la sémantique de tableau aux technologies
 * d'assistance : la structure survit au changement de présentation.
 */
export function ProductProofObservations({
  observations,
  evidenceRef,
}: {
  observations: readonly ProofObservation[];
  evidenceRef: string;
}) {
  return (
    <table className="rows observations" role="table">
      <caption className="visually-hidden">
        Three observations from the same query panel. One of them is developed in full below.
      </caption>
      <thead>
        <tr role="row">
          <th scope="col" role="columnheader">Query</th>
          <th scope="col" role="columnheader">Status</th>
          <th scope="col" role="columnheader">Answer</th>
          <th scope="col" role="columnheader">Cit.</th>
          <th scope="col" role="columnheader">Evidence</th>
        </tr>
      </thead>
      <tbody>
        {observations.map((observation) => (
          <tr key={observation.ref} role="row">
            <th scope="row" role="rowheader" data-label="Query" className="observations__query">
              {observation.query}
            </th>

            <td role="cell" data-label="Status" className="observations__status">
              {OBSERVATION_STATUS_LABEL[observation.status]}
            </td>

            {/* Texte INTACT dans le DOM ; l'abrègement est purement visuel (comme dans le produit,
                qui clampe en CSS et ne tronque jamais la donnée). L'Evidence rendra exactement le
                même texte, sans retraitement. */}
            <td role="cell" data-label="Answer" className="observations__answer">
              {observation.answer.kind === "captured" ? (
                <span className="clamp-2">{observation.answer.text}</span>
              ) : (
                <span className="muted">{ANSWER_NOT_CAPTURED_LABEL}</span>
              )}
            </td>

            <td role="cell" data-label="Cit." className="num">
              {observation.citationCount === null ? (
                // Pas de surface de réponse : il n'y avait rien à dénombrer. Écrire « 0 » ici
                // affirmerait un décompte qui n'a pas eu lieu.
                <span
                  className="not-observable"
                  aria-label="not applicable — no answer surface to count citations from"
                >
                  {NOT_APPLICABLE_LABEL}
                </span>
              ) : (
                observation.citationCount
              )}
            </td>

            <td role="cell" data-label="Evidence" className="observations__evidence">
              {observation.ref === evidenceRef ? "Shown below" : <span className="muted">Not shown</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
