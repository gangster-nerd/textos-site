import type { Metadata } from "next";

import {
  MEASUREMENT_FORM_ENDPOINT,
  MEASUREMENT_REQUEST_COPY,
} from "@/lib/conversion/measurement-request-copy";

// Destination du CTA `measurement_request`. Page STATIQUE gouvernée : la copy vient du registre
// fermé, jamais du Markdown ni du sous-traitant. Le prestataire ne fournit que l'endpoint de
// réception, l'anti-spam et la notification — il ne possède pas le parcours éditorial.
export const dynamic = "force-static";

const { form } = MEASUREMENT_REQUEST_COPY;

export const metadata: Metadata = {
  title: form.title,
  description: form.intro,
  // Toujours hors index : cette page n'est pas une surface de recherche, et l'origine reste
  // provisoire tant que D0B/S4 n'a pas tranché le domaine.
  robots: { index: false, follow: false },
};

export default function RequestMeasurementPage() {
  const endpoint = MEASUREMENT_FORM_ENDPOINT;

  return (
    <main>
      <article>
        <h1>{form.title}</h1>
        <p>{form.intro}</p>

        {endpoint === null ? (
          // Aucun endpoint configuré : on n'affiche pas un formulaire qui n'aboutit nulle part.
          // Même doctrine que le CTA — pas de bouton mort, pas de promesse différée.
          <p role="status" data-form-state="unavailable">
            {form.unavailableMessage}
          </p>
        ) : (
          <form method="POST" action={endpoint} data-form-state="available">
            {/* Attribution : rattache la soumission au contenu et à la variante de CTA, avec la
                version de copy affichée. Champs cachés — jamais saisis par le visiteur. */}
            <input type="hidden" name="content_ref" value="request-measurement" />
            <input type="hidden" name="cta_id" value="measurement_request" />
            <input type="hidden" name="copy_version" value={MEASUREMENT_REQUEST_COPY.version} />

            <p>
              <label htmlFor="email">{form.emailLabel}</label>
              <br />
              <input type="email" id="email" name="email" required autoComplete="email" />
              <br />
              <small>{form.emailHelp}</small>
            </p>

            <p>
              <label htmlFor="brand">{form.brandLabel}</label>
              <br />
              <input type="text" id="brand" name="brand" required />
              <br />
              <small>{form.brandHelp}</small>
            </p>

            <p>
              <label htmlFor="buyer_questions">{form.fieldLabel}</label>
              <br />
              <textarea id="buyer_questions" name="buyer_questions" rows={6} required />
              <br />
              <small>{form.fieldHelp}</small>
            </p>

            <p role="note" data-form-warning>
              <strong>{form.warning}</strong>
            </p>

            <button type="submit">{form.submitLabel}</button>
          </form>
        )}
      </article>
    </main>
  );
}
