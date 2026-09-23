"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ConversionMode } from "@/lib/conversion/conversion-config";
import type { MeasurementRequestCopy } from "@/lib/conversion/measurement-request-copy";

type Props = {
  mode: ConversionMode;
  /** Endpoint du sous-traitant — non `null` en `live` seulement. */
  endpoint: string | null;
  copy: MeasurementRequestCopy["form"];
  copyVersion: string;
};

const MAX_QUESTIONS = 10;

// Formulaire de demande de mesure. STRICTEMENT la même copy, les mêmes champs et la même
// attribution en démo et en production : seule la LIVRAISON change.
//
// En `demo`, la soumission est interceptée côté client : aucune requête réseau, aucune donnée
// stockée, aucune valeur saisie dans l'URL. La redirection ne porte qu'un indicateur de mode.
//
// Les questions acheteur sont saisies comme AUTANT de champs `buyer_questions`, pas une seule zone
// de texte : le sous-traitant reçoit le panel tel quel — des valeurs répétées, jamais une chaîne
// concaténée qu'il faudrait ré-analyser côté back-office. La première est requise ; les suivantes
// naissent DÉSACTIVÉES (`disabled`) tant qu'on ne les ouvre pas, pour qu'une ligne jamais touchée
// ne soumette jamais une valeur vide.
export function MeasurementRequestForm({ mode, endpoint, copy, copyVersion }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [questionCount, setQuestionCount] = useState(1);
  const [emptyQuestionError, setEmptyQuestionError] = useState(false);

  const isDemo = mode === "demo";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const questions = Array.from(
      form.querySelectorAll<HTMLInputElement>('input[name="buyer_questions"]:not(:disabled)')
    );
    // Rejet des questions vides ou blanches — la première est requise par l'attribut HTML, mais
    // « required » n'empêche pas un texte fait uniquement d'espaces.
    if (questions.some((q) => q.value.trim() === "")) {
      event.preventDefault();
      setEmptyQuestionError(true);
      return;
    }
    setEmptyQuestionError(false);

    if (isDemo) {
      // Interception : rien ne sort du navigateur. Aucun champ saisi n'est transmis — ni en
      // query, ni en storage, ni en log.
      event.preventDefault();
      setSubmitting(true);
      router.push("/request-measurement/received?mode=demo");
    }
    // En `live`, aucun `preventDefault` : le navigateur poste nativement, avec autant de valeurs
    // `buyer_questions` que de champs activés.
  }

  return (
    <form
      method="POST"
      // En démo, `action` reste vide ET le submit est intercepté : deux verrous, pas un.
      action={isDemo ? undefined : (endpoint ?? undefined)}
      onSubmit={handleSubmit}
      data-conversion-mode={mode}
      data-form-state="available"
    >
      {/* Attribution : rattache la soumission au contenu et à la variante, avec la version de copy
          affichée. Aucune donnée personnelle — trois identifiants techniques. */}
      <input type="hidden" name="content_ref" value="request-measurement" />
      <input type="hidden" name="cta_id" value="measurement_request" />
      <input type="hidden" name="copy_version" value={copyVersion} />

      <p>
        <label htmlFor="email">{copy.emailLabel}</label>
        <br />
        <input type="email" id="email" name="email" required autoComplete="email" />
        <br />
        <small>{copy.emailHelp}</small>
      </p>

      <p>
        <label htmlFor="brand">{copy.brandLabel}</label>
        <br />
        <input type="text" id="brand" name="brand" required />
        <br />
        <small>{copy.brandHelp}</small>
      </p>

      <fieldset>
        <legend>{copy.fieldLabel}</legend>
        <p>
          <small>{copy.fieldHelp}</small>
        </p>
        {Array.from({ length: MAX_QUESTIONS }, (_, index) => {
          const active = index < questionCount;
          return (
            <p key={index} hidden={!active}>
              <label htmlFor={`buyer_question_${index}`} className="visually-hidden">
                {copy.fieldLabel} {index + 1}
              </label>
              <input
                type="text"
                id={`buyer_question_${index}`}
                name="buyer_questions"
                required={index === 0}
                disabled={!active}
              />
              {active && index === questionCount - 1 && index > 0 ? (
                <button
                  type="button"
                  onClick={() => setQuestionCount((n) => n - 1)}
                  aria-label={copy.removeQuestionLabel}
                >
                  {copy.removeQuestionLabel}
                </button>
              ) : null}
            </p>
          );
        })}
        {questionCount < MAX_QUESTIONS ? (
          <button type="button" onClick={() => setQuestionCount((n) => n + 1)}>
            {copy.addQuestionLabel}
          </button>
        ) : null}
        {emptyQuestionError ? (
          <p role="alert" data-form-error>
            {copy.emptyQuestionError}
          </p>
        ) : null}
      </fieldset>

      <p role="note" data-form-warning>
        <strong>{copy.warning}</strong>
      </p>

      <button type="submit" disabled={submitting}>
        {copy.submitLabel}
      </button>
    </form>
  );
}

export default MeasurementRequestForm;
