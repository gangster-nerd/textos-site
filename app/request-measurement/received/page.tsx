import type { Metadata } from "next";
import { Suspense } from "react";

import { DemoSubmissionNotice } from "@/components/conversion/DemoSubmissionNotice";
import { MEASUREMENT_REQUEST_COPY } from "@/lib/conversion/measurement-request-copy";

// Confirmation GOUVERNÉE, dans ce repo — pas un écran de succès configurable chez le fournisseur.
// C'est le point où une copy non gouvernée promettrait ce que le produit refuse : acceptation,
// délai, réponse systématique, mesure automatique, livraison.
//
// En production, seule la mention « Demo submission simulated » disparaît. Le corps est identique.
export const dynamic = "force-static";

const { confirmation } = MEASUREMENT_REQUEST_COPY;

export const metadata: Metadata = {
  title: confirmation.title,
  robots: { index: false, follow: false },
};

export default function RequestReceivedPage() {
  return (
    <main>
      <article>
        <h1>{confirmation.title}</h1>
        <Suspense fallback={null}>
          <DemoSubmissionNotice />
        </Suspense>
        <p data-confirmation-body>{confirmation.body}</p>
      </article>
    </main>
  );
}
