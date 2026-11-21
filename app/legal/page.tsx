import type { Metadata } from "next";
import Link from "next/link";

// Index des documents légaux. Il ne liste QUE les documents réellement servis par ce site, et il dit
// ce que chacun couvre RÉELLEMENT — une page qui annoncerait un document absent, ou qui donnerait à
// un document une portée qu'il n'a pas, serait un mensonge par omission.
//
// Correction du 21/11/2026 : la ligne « Politique de confidentialité » annonçait une politique
// couvrant le service, alors que /privacy ne sert, dans cet état de configuration, qu'un avis
// relatif au formulaire de demande de mesure. Le commentaire ci-dessus l'interdisait déjà ; le code
// ne le vérifiait pas. L'écart a été relevé par la revue des écarts entre les CGV et l'interface.
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

        <h2>Le contrat</h2>
        <ul>
          <li>
            <Link href="/legal/cgv">Conditions générales de vente et d&apos;utilisation</Link> — version 2.0, en vigueur le 21
            novembre 2026
          </li>
          <li>
            <Link href="/legal/offres-et-tarifs">Annexe « Offres et tarifs »</Link> — version 1.0, en vigueur le 21 novembre
            2026. C&apos;est le document visé à l&apos;article 2.1 (iv) des conditions générales : il décrit le contenu exact
            de chaque offre, et seul ce qui y figure est dû.
          </li>
        </ul>

        <h2>Données personnelles</h2>
        <p>
          <Link href="/privacy">L&apos;avis de ce site</Link> porte sur le formulaire de demande de mesure qu&apos;il héberge,
          et sur lui seul. Il ne décrit pas le traitement des données d&apos;un compte, d&apos;une facturation ou de
          l&apos;utilisation du service : ces questions relèvent du contrat et de l&apos;adresse de contact qui y figure.
        </p>
        <p>
          Le contrat de sous-traitance (DPA) et la liste des sous-traitants ultérieurs sont remis sur demande à
          l&apos;adresse de contact indiquée dans les conditions générales. Ils ne sont pas publiés sur ce site.
        </p>
      </article>
    </main>
  );
}
