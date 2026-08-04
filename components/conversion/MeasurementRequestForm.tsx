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

// Formulaire de demande de mesure. STRICTEMENT la même copy, les mêmes champs et la même
// attribution en démo et en production : seule la LIVRAISON change.
//
// En `demo`, la soumission est interceptée côté client : aucune requête réseau, aucune donnée
// stockée, aucune valeur saisie dans l'URL. La redirection ne porte qu'un indicateur de mode.
export function MeasurementRequestForm({ mode, endpoint, copy, copyVersion }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const isDemo = mode === "demo";

  function handleDemoSubmit(event: React.FormEvent<HTMLFormElement>) {
    // Interception : rien ne sort du navigateur.
    event.preventDefault();
    setSubmitting(true);
    // Aucun champ saisi n'est transmis — ni en query, ni en storage, ni en log.
    router.push("/request-measurement/received?mode=demo");
  }

  return (
    <form
      method="POST"
      // En démo, `action` reste vide ET le submit est intercepté : deux verrous, pas un.
      action={isDemo ? undefined : (endpoint ?? undefined)}
      onSubmit={isDemo ? handleDemoSubmit : undefined}
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

      <p>
        <label htmlFor="buyer_questions">{copy.fieldLabel}</label>
        <br />
        <textarea id="buyer_questions" name="buyer_questions" rows={6} required />
        <br />
        <small>{copy.fieldHelp}</small>
      </p>

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
