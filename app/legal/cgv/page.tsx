import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Page STATIQUE : le texte servi est EXACTEMENT le fichier versionné dans `legal/cgv.md`.
//
// Ce fichier vit HORS de `content/` à dessein. Dans ce dépôt, `content/<nom>` ne désigne pas « des
// fichiers de contenu » : il déclare une COLLECTION ÉDITORIALE, et chaque page exportée d'une
// collection doit porter un nœud JSON-LD (`scripts/validate-jsonld.mjs`) et entrer au manifeste
// d'attribution. Un document contractuel servi en `noindex` ne remplit ni ne doit remplir ce
// contrat : le placer dans `content/` l'y inscrivait par le seul effet du nom du répertoire, et
// rendait le gate du site rouge. La convention est portée par l'arborescence, pas par un commentaire.
// Rien n'est reformulé ici, et aucune donnée n'est injectée à l'exécution : un document qui engage
// ne doit pas pouvoir différer selon le moment où il est lu. Le diff du fichier est la seule trace
// d'un changement de version, et c'est voulu.
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Conditions générales de vente et d'utilisation — TextOS",
  description: "Conditions générales de vente et d'utilisation du service TextOS.",
  robots: { index: false, follow: false },
};

export default function ConditionsGeneralesPage() {
  const source = readFileSync(join(process.cwd(), "legal/cgv.md"), "utf8");

  return (
    <main>
      <article>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
      </article>
    </main>
  );
}
