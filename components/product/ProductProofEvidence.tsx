import type { ProductProofExample, ProofObservation } from "@/lib/product-proof/example";
import { CITATION_KIND_LABEL } from "@/lib/product-proof/public-vocabulary";

/**
 * L'Evidence d'UNE observation, dans la hiérarchie réelle du produit : réponse complète →
 * citations → provenance (textos-v0 @ 2f86435, src/components/evidence/evidence-panel.tsx).
 *
 * COUCHE OBSERVE, ET ELLE SEULE. Aucun claim, aucune abstention, aucune interprétation : le produit
 * lui-même diffère cette couche (D2B), au motif que le contexte d'extraction d'un run historique
 * n'est ni gouverné ni reproductible. Le site ne peut pas montrer plus que le produit ne restitue.
 *
 * Ce que le visiteur doit comprendre ici : TextOS ne montre pas seulement un nombre — l'observation
 * qui le produit est conservée, adressable et datée.
 */
export function ProductProofEvidence({
  observation,
  evidence,
}: {
  observation: ProofObservation;
  evidence: ProductProofExample["evidence"];
}) {
  const { citations, provenance } = evidence;

  return (
    <div className="evidence">
      {/* La relation avec la ligne du dessus est NARRATIVE : ce titre nomme la requête développée.
          Aucune sélection, aucun surlignage de ligne — rien à cliquer, donc rien à simuler. */}
      <h4 className="evidence__title">
        Evidence for one observation
        <span className="evidence__query"> &mdash; &ldquo;{observation.query}&rdquo;</span>
      </h4>

      <section className="evidence__section" aria-labelledby="evidence-answer">
        <h5 className="data-label" id="evidence-answer">Answer</h5>
        {observation.answer.kind === "captured" ? (
          <p className="evidence__answer">{observation.answer.text}</p>
        ) : (
          <p className="evidence__answer muted">No answer was captured for this observation.</p>
        )}
      </section>

      <section className="evidence__section" aria-labelledby="evidence-citations">
        <h5 className="data-label" id="evidence-citations">Citations ({citations.length})</h5>
        {citations.length === 0 ? (
          // Zéro citation est un FAIT structurel, pas une erreur : étiqueté neutre, jamais dramatisé.
          <p className="muted">No citation for this observation.</p>
        ) : (
          <ul className="citations">
            {citations.map((citation) => (
              <li key={citation.sourceDomain} className="citation">
                <p className="citation__meta">
                  <span className="citation__kind">{CITATION_KIND_LABEL[citation.kind]}</span>
                  {/* Domaine en mono : donnée mécanique exacte. PAS un lien — `.example` n'est
                      joignable par personne, et un lien mort serait une fausse affordance. */}
                  <span className="citation__source">{citation.sourceDomain}</span>
                </p>
                <p className="citation__snippet">&ldquo;{citation.snippet}&rdquo;</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="evidence__section provenance" aria-labelledby="evidence-provenance">
        <h5 className="data-label" id="evidence-provenance">Provenance</h5>
        <dl className="provenance__rows">
          <div className="provenance__row">
            <dt>Panel</dt>
            <dd>{provenance.panel}</dd>
          </div>
          <div className="provenance__row">
            <dt>Engine / surface</dt>
            <dd>{provenance.engineSurface}</dd>
          </div>
          <div className="provenance__row">
            <dt>Method version</dt>
            <dd>{provenance.methodVersion}</dd>
          </div>
          <div className="provenance__row">
            <dt>Observed at</dt>
            <dd>{provenance.observedAt}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
