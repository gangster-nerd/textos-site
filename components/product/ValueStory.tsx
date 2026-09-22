"use client";

import { useEffect, useRef, useState } from "react";

import {
  TRACKED_BRAND,
  VALUE_STORY_ANSWER,
  VALUE_STORY_CAUSALITY_DISCLAIMER,
  VALUE_STORY_DETECT_TEXT,
  VALUE_STORY_FRAMES,
  VALUE_STORY_HEADLINE,
  VALUE_STORY_LEDE,
  VALUE_STORY_WRITE_TEXT,
} from "@/lib/product-proof/value-story-example";

// SITE-R1-VALUE-STORY-1 — le récit de valeur : ABSENCE → détection → rédaction/publication →
// PRÉSENCE. Remplace, comme premier repère après le titre, ce que la page montrait jusqu'ici en
// premier (le panneau Authority Presence, désormais repositionné plus bas comme preuve/méthode) :
// l'architecture d'une mesure importe moins, ici, que la transformation qu'elle rend possible.
//
// AUCUNE CAUSALITÉ GARANTIE : `VALUE_STORY_CAUSALITY_DISCLAIMER` est toujours affiché, dans les
// deux modes de rendu (animé et `prefers-reduced-motion`). Publier n'implique jamais d'obtenir une
// citation — seule une nouvelle mesure peut l'observer.
const STEP_DURATION_MS = 2200;

export function ValueStory() {
  const [step, setStep] = useState(0);
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion !== false) return;
    timerRef.current = setInterval(() => {
      setStep((s) => (s + 1) % VALUE_STORY_FRAMES.length);
    }, STEP_DURATION_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [reducedMotion]);

  // AVANT que l'effet client ne confirme la préférence (`reducedMotion === null`, y compris le
  // rendu serveur), on affiche la scène ANIMÉE au premier repère (statique, non encore cyclée) —
  // jamais la grille des quatre états. Choisir la grille par défaut ferait basculer TOUTE visite
  // d'une mise en page à l'autre dès l'hydratation, alors que ne choisir la scène unique par
  // défaut ne coûte ce même saut qu'aux visiteurs qui préfèrent réellement un mouvement réduit —
  // une minorité, et un saut qu'ils ne verront qu'une fois, jamais répété.
  const showStatic = reducedMotion === true;

  return (
    <section className="value-story" aria-label="How TextOS turns an absence into a measured presence">
      <p className="kicker">Illustrative workflow</p>
      <h2 className="value-story__headline">{VALUE_STORY_HEADLINE}</h2>
      <p className="lede">{VALUE_STORY_LEDE}</p>

      {showStatic ? (
        <div className="value-story__static">
          {VALUE_STORY_FRAMES.map((frame) => (
            <div className="value-story__static-frame" key={frame.id}>
              <ValueStoryStage stepId={frame.id} />
              <p className="value-story__label">{frame.label}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="value-story__stage-wrap">
          <div className="value-story__stage" aria-live="polite">
            <ValueStoryStage stepId={VALUE_STORY_FRAMES[step].id} />
          </div>
          <ol className="value-story__steps">
            {VALUE_STORY_FRAMES.map((frame, i) => (
              <li key={frame.id} data-active={i === step}>
                {frame.label}
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="value-story__disclaimer">{VALUE_STORY_CAUSALITY_DISCLAIMER}</p>
    </section>
  );
}

function ValueStoryStage({ stepId }: { stepId: string }) {
  if (stepId === "absent" || stepId === "present") {
    const state = stepId === "absent" ? VALUE_STORY_ANSWER.before : VALUE_STORY_ANSWER.after;
    return (
      <div className="value-story__answer" data-state={stepId}>
        <div className="value-story__answer-head">
          <span className="data-label">AI answer &middot; illustrative</span>
        </div>
        <p className="value-story__question">&ldquo;{VALUE_STORY_ANSWER.question}&rdquo;</p>
        <p className="value-story__answer-text">{state.text}</p>
        <ul className="value-story__sources">
          {state.citations.map((c) => (
            <li
              key={c.sourceDomain}
              className="value-story__source-chip"
              data-brand={"brand" in c && c.brand ? "true" : undefined}
            >
              {c.sourceDomain}
            </li>
          ))}
          {stepId === "absent" ? (
            <li className="value-story__source-chip value-story__source-chip--ghost">
              <span className="value-story__marker" aria-hidden="true" />
              {TRACKED_BRAND} &mdash; not cited
            </li>
          ) : null}
        </ul>
        {stepId === "present" ? (
          <p className="value-story__presence-note">
            <span className="value-story__marker value-story__marker--found" aria-hidden="true" />
            {TRACKED_BRAND} &mdash; cited
          </p>
        ) : null}
      </div>
    );
  }

  if (stepId === "detect") {
    return (
      <div className="value-story__compact">
        <span className="value-story__marker" aria-hidden="true" />
        <p>{VALUE_STORY_DETECT_TEXT}</p>
      </div>
    );
  }

  // "write"
  return (
    <div className="value-story__compact value-story__compact--write">
      <svg
        className="value-story__pen"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M4 20l1.2-4.8L16.6 3.8a1.7 1.7 0 0 1 2.4 0l1.2 1.2a1.7 1.7 0 0 1 0 2.4L8.8 18.8 4 20z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path d="M14.8 6.2l2.8 2.8" stroke="currentColor" strokeWidth="1.4" />
      </svg>
      <div>
        <p>{VALUE_STORY_WRITE_TEXT}</p>
        <div className="value-story__draft-lines" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <span className="value-story__status-badge">Published</span>
      </div>
    </div>
  );
}

export default ValueStory;
