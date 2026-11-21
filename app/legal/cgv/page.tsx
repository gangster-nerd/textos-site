import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Page STATIQUE : le texte servi est EXACTEMENT le fichier versionné dans `content/legal/cgv.md`.
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
  const source = readFileSync(join(process.cwd(), "content/legal/cgv.md"), "utf8");

  return (
    <main>
      <article>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
      </article>
    </main>
  );
}
