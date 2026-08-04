import type { Metadata } from "next";

import { DemoDisclosure } from "@/components/conversion/DemoDisclosure";
import { MeasurementRequestForm } from "@/components/conversion/MeasurementRequestForm";
import { conversionConfig } from "@/lib/conversion/conversion-config";
import { MEASUREMENT_REQUEST_COPY } from "@/lib/conversion/measurement-request-copy";

// Destination du CTA `measurement_request`. Page STATIQUE gouvernée : la copy vient du registre
// fermé, jamais du Markdown ni du sous-traitant. Le prestataire ne fournit que l'endpoint de
// réception — il ne possède pas le parcours éditorial.
//
// La page est IDENTIQUE en démo et en production, au bandeau de démonstration près.
export const dynamic = "force-static";

const { form } = MEASUREMENT_REQUEST_COPY;

export const metadata: Metadata = {
  title: form.title,
  description: form.intro,
  robots: { index: false, follow: false },
};

export default function RequestMeasurementPage() {
  return (
    <main>
      <article>
        <h1>{form.title}</h1>
        <p>{form.intro}</p>

        <DemoDisclosure />

        {conversionConfig.isOff ? (
          // Mode `off` : aucun formulaire actif. Pas de bouton grisé, pas de promesse différée.
          <p role="status" data-form-state="unavailable">
            {form.unavailableMessage}
          </p>
        ) : (
          <MeasurementRequestForm
            mode={conversionConfig.mode}
            endpoint={conversionConfig.formEndpoint}
            copy={form}
            copyVersion={MEASUREMENT_REQUEST_COPY.version}
          />
        )}
      </article>
    </main>
  );
}
