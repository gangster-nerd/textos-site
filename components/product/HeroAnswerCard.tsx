"use client";

import { useEffect, useState } from "react";

import { exampleAnswer as a } from "@/lib/fixtures/example-answer";

/**
 * Carte de réponse du hero — la proposition de valeur rendue littérale.
 *
 * ELLE MONTRE, ELLE N'EXPLIQUE PAS. Une seule réponse de moteur, deux états : la marque absente,
 * puis la marque citée avec sa source. La question, le panel et les sources non-marque ne bougent
 * pas — c'est l'invariant que `example-answer.ts` vérifie au chargement. Un lecteur qui ne lit rien
 * voit une marque apparaître dans une réponse ; c'est tout ce que cette carte doit produire.
 *
 * APP-LIKE, PAS APP-FAKE, comme `ExampleMeasurement`. Aucun compte, aucun run exécuté, aucun
 * provider appelé. Le titre « Example answer » est le premier élément lu, il est annoncé aux
 * lecteurs d'écran via `aria-labelledby`, et l'étiquette « Illustrative » le redit en clair.
 *
 * L'ABSENCE SE REND EN NEUTRE. La doctrine de tonalité du contrat visuel (app/globals.css §2) est
 * explicite : une absence observée est un CONSTAT DE MESURE, pas une alerte. Elle va en neutre,
 * jamais en ambre, jamais en rouge, jamais comme un zéro. Seule la source de la marque prend
 * l'accent — parce qu'elle est un lien qui existe, ce qui est précisément la nouvelle.
 *
 * ACCESSIBILITÉ. Le contenu se met à jour seul plus de 5 s : WCAG 2.2.2 exige un moyen de
 * l'arrêter. Le bouton le fait et ne se réarme jamais dans le dos du lecteur. Sous
 * `prefers-reduced-motion`, l'alternance ne démarre pas du tout : la carte reste sur l'état
 * d'absence et le bouton devient le seul moteur.
 *
 * Le rendu serveur produit l'état d'ABSENCE. C'est l'état qu'un lecteur sans JavaScript garde, et
 * c'est le bon : il pose le problème que le reste de la page résout.
 */

const ABSENT_MS = 6200;
const CITED_MS = 6800;

export function HeroAnswerCard() {
  const [cited, setCited] = useState(false);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto) return;
    // Mouvement réduit : on ne démarre pas l'alternance. Le bouton reste disponible.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setTimeout(() => setCited((on) => !on), cited ? CITED_MS : ABSENT_MS);
    return () => window.clearTimeout(id);
  }, [auto, cited]);

  const state = cited ? a.cited : a.absent;

  return (
    <figure className="panel answer" aria-labelledby="hero-answer-title">
      <div className="panel__head">
        <h2 className="panel__title" id="hero-answer-title">
          Example answer
        </h2>
        <span className="panel__badge">Illustrative</span>
      </div>

      <div className="panel__body answer__body">
        <p className="data-label answer__meta">
          {a.queryLabel} &middot; panel {a.panelVersion} &middot;{" "}
          {cited ? "after, same panel" : "before"}
        </p>

        <p className="answer__query">
          <span aria-hidden="true">&rsaquo;</span> {a.query}
        </p>

        {/* `key` sur l'état : React remonte le bloc, donc l'animation d'entrée rejoue. Sans lui,
            le texte changerait sans que rien ne signale qu'on regarde une autre réponse. */}
        <div className="answer__result" key={cited ? "cited" : "absent"}>
          <p className="answer__text">{state.body}</p>

          <p className="data-label answer__sources-label">Cited</p>
          <ul className="answer__sources">
            {state.sources.map((source) => (
              <li
                key={source.host}
                className={source.brand ? "answer__chip answer__chip--brand" : "answer__chip"}
              >
                {source.host}
                {source.path ?? ""}
              </li>
            ))}
          </ul>

          <p className={cited ? "answer__verdict answer__verdict--cited" : "answer__verdict"}>
            <span className="answer__dot" aria-hidden="true" />
            {cited ? "your brand — cited, with its source" : "your brand — not cited"}
          </p>
        </div>
      </div>

      <figcaption className="panel__note answer__note">
        <span>
          Same question, same panel.{" "}
          <strong className="answer__note-strong">The only difference is the evidence.</strong>
        </span>
        <button
          type="button"
          className="answer__toggle"
          onClick={() => {
            setAuto(false);
            setCited((on) => !on);
          }}
        >
          {cited ? "Show before" : "Show after"}
        </button>
      </figcaption>
    </figure>
  );
}
