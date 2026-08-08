import { exampleMeasurement as m } from "@/lib/fixtures/example-measurement";

/**
 * Panneau de mesure d'exemple.
 *
 * APP-LIKE, PAS APP-FAKE. Il montre la FORME d'une mesure TextOS — panel versionné, observabilité,
 * trois mesures séparées, union — sans jamais suggérer un compte, un run exécuté, un provider
 * appelé ou une donnée client. Rien ici n'est interactif : il n'y a rien à actionner, donc rien qui
 * puisse laisser croire qu'un traitement se déclenche.
 *
 * L'étiquette « Example measurement » n'est pas décorative : elle est le premier élément lu, elle
 * est annoncée aux lecteurs d'écran via `aria-describedby`, et elle est répétée en clair sous le
 * panneau. Un lecteur pressé doit comprendre en une seconde que ce ne sont pas ses données.
 *
 * Les valeurs viennent de `lib/fixtures/` et n'existent pas ici : le jour où une mesure réelle les
 * remplacera, ce composant ne changera pas.
 */
export function ExampleMeasurement() {
  return (
    <figure className="panel" aria-labelledby="example-measurement-title">
      <div className="panel__head">
        <h2 className="panel__title" id="example-measurement-title">
          Authority Presence
        </h2>
        <span className="panel__badge">Example measurement</span>
      </div>

      <div className="panel__body">
        <dl className="metrics">
          <div className="metric">
            <dt className="data-label">Query panel</dt>
            <dd className="data-value">
              {m.queriesInPanel} <span className="muted">· {m.panelVersion}</span>
            </dd>
          </div>
          <div className="metric">
            <dt className="data-label">Observed</dt>
            <dd className="data-value">{m.observed}</dd>
          </div>
          <div className="metric">
            <dt className="data-label">Not observable</dt>
            {/* Jamais rendu comme un zéro : ni la valeur, ni le style ne l'y ramènent. */}
            <dd className="data-value">{m.notObservable}</dd>
          </div>
          <div className="metric">
            <dt className="data-label">Completeness</dt>
            <dd className="data-value">{m.completeness}%</dd>
          </div>
        </dl>
      </div>

      <div className="rows-scroll">
        <table className="rows">
          <caption className="visually-hidden">
            Example measurement — three separate measures over {m.observed} observed queries.
          </caption>
          <thead>
            <tr>
              <th scope="col">Measure</th>
              <th scope="col">Queries</th>
              <th scope="col">Share of observed</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Direct Share of Model</th>
              <td className="num">{m.directCount}</td>
              <td className="num">{m.directShare}%</td>
            </tr>
            <tr>
              <th scope="row">Indirect Mention Share</th>
              <td className="num">{m.indirectCount}</td>
              <td className="num">{m.indirectShare}%</td>
            </tr>
            <tr>
              <th scope="row">
                Total Authority Presence <span className="muted">(union)</span>
              </th>
              <td className="num">{m.totalCount}</td>
              <td className="num">{m.totalShare}%</td>
            </tr>
            <tr>
              <th scope="row" className="muted">
                Not observable
              </th>
              <td className="num not-observable">{m.notObservable}</td>
              {/* Le tiret cadratin dit « pas de valeur », là où « 0 % » dirait « aucune présence ». */}
              <td className="num not-observable" aria-label="not reported as a share">
                &mdash;
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <figcaption className="panel__note">
        <strong>Example measurement.</strong> Illustrative values, not a real run and not client
        data. Direct and Indirect overlap on {m.overlapCount} queries, so Total is{" "}
        <strong>{m.totalCount}</strong> — the union — and not {m.naiveSum}, their sum.{" "}
        {m.notObservable} queries were not observable with this method and are reported as such,
        never as zero. Total observed across {m.runs} runs of the same panel: {m.dispersionLabel}.
      </figcaption>
    </figure>
  );
}
