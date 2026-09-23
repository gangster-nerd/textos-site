import { TRACKED_BRAND, VALUE_STORY_ANSWER } from "@/lib/product-proof/value-story-example";

/**
 * Carte de réponse du hero — le problème posé en objet, pas en mots.
 *
 * ELLE MONTRE L'ABSENCE, ET RIEN D'AUTRE. Une vraie réponse de moteur à une vraie question, avec
 * sa source citée, et la marque suivie qui n'y est pas. C'est le premier des quatre repères de
 * `ValueStory` figé au-dessus de la ligne de flottaison : le visiteur voit le problème avant de
 * lire ce qu'on en fait.
 *
 * ELLE NE RACONTE PAS LA TRANSFORMATION. `ValueStory`, juste en dessous, porte l'avant/après
 * complet. Le dire deux fois sur le même écran n'ajouterait rien et affaiblirait les deux.
 *
 * MÊME FIXTURE, PAS UNE COPIE. La question, le texte et les citations sont LUS depuis
 * `value-story-example.ts`. C'est donc littéralement la même réponse, dans le même univers
 * illustratif que « Inside one measurement » plus bas — un visiteur qui descend reconnaît un
 * exemple, il n'en apprend pas trois. Un second jeu de valeurs aurait dérivé dès la première
 * réécriture.
 *
 * APP-LIKE, PAS APP-FAKE, comme `ExampleMeasurement` : aucun compte, aucun run, rien à actionner.
 * Rien n'est interactif, donc rien ne peut laisser croire qu'un traitement se déclenche — et la
 * carte reste un composant serveur, sans une ligne de JavaScript.
 *
 * L'ABSENCE SE REND EN NEUTRE. La doctrine de tonalité du contrat visuel (app/globals.css §2) le
 * dit : une absence observée est un CONSTAT DE MESURE, pas une alerte. Ni ambre, ni rouge, ni un
 * zéro. C'est le filet POINTILLÉ qui porte le constat, pas une couleur d'alarme.
 */
export function HeroAnswerCard() {
  const { question, before } = VALUE_STORY_ANSWER;

  return (
    <figure className="panel answer" aria-labelledby="hero-answer-title">
      <div className="panel__head">
        <h2 className="panel__title" id="hero-answer-title">
          Example answer
        </h2>
        <span className="panel__badge">Illustrative</span>
      </div>

      <div className="panel__body answer__body">
        <p className="data-label answer__meta">One question, one answer engine</p>

        <p className="answer__query">
          <span aria-hidden="true">&rsaquo;</span> {question}
        </p>

        <p className="answer__text">{before.text}</p>

        <p className="data-label answer__sources-label">Cited</p>
        <ul className="answer__sources">
          {before.citations.map((citation) => (
            <li key={citation.sourceDomain} className="answer__chip">
              {citation.sourceDomain}
            </li>
          ))}
        </ul>

        <p className="answer__verdict">
          <span className="answer__dot" aria-hidden="true" />
          {TRACKED_BRAND} &mdash; not cited in this answer
        </p>
      </div>

      <figcaption className="panel__note">
        The answer is complete without it.{" "}
        <strong className="answer__note-strong">That absence is what gets measured</strong> &mdash;
        and the workflow below starts from this exact question.
      </figcaption>
    </figure>
  );
}
