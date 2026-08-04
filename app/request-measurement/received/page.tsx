import type { Metadata } from "next";

import { DemoSubmissionNotice } from "@/components/conversion/DemoSubmissionNotice";
import { MEASUREMENT_REQUEST_COPY } from "@/lib/conversion/measurement-request-copy";

// Confirmation GOUVERNÉE, dans ce repo — pas un écran de succès configurable chez le fournisseur.
// C'est le point où une copy non gouvernée promettrait ce que le produit refuse : acceptation,
// délai, réponse systématique, mesure automatique, livraison.
//
// En production, seule la mention « Demo submission simulated » disparaît. Le corps est identique.
// Le mode vient du BUILD, jamais de `?mode=` — un paramètre d'URL ne décide d'aucune copy.
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
        <DemoSubmissionNotice />
        <p data-confirmation-body>{confirmation.body}</p>
      </article>
    </main>
  );
}
