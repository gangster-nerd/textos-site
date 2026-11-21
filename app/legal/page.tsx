import type { Metadata } from "next";
import Link from "next/link";

// Index des documents légaux. Il ne liste QUE les documents réellement servis par ce site : une
// page qui annoncerait un document absent serait un mensonge par omission, le même défaut que la
// page de confidentialité évite déjà en admettant son propre défaut de configuration.
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Documents légaux — TextOS",
  description: "Documents légaux applicables au service TextOS.",
  robots: { index: false, follow: false },
};

export default function LegalIndexPage() {
  return (
    <main>
      <article>
        <h1>Documents légaux</h1>

        <ul>
          <li>
            <Link href="/legal/cgv">Conditions générales de vente et d&apos;utilisation</Link> — version 2.0, en vigueur le 21
            novembre 2026
          </li>
          <li>
            <Link href="/privacy">Politique de confidentialité</Link>
          </li>
        </ul>

        <p>
          Le contrat de sous-traitance (DPA) et la liste des sous-traitants sont remis sur demande à l&apos;adresse de contact
          indiquée dans les conditions générales. Ils ne sont pas publiés sur ce site.
        </p>
      </article>
    </main>
  );
}
