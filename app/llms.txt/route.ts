// /llms.txt — table des matières pour les modèles de langage (page-map.spec.md §/llms.txt).
//
// Une seule source : les entrées du sitemap. Ce fichier ne peut donc jamais annoncer davantage que
// ce que le site laisse indexer :
//   - build non indexable (aujourd'hui : entrée non indexée, origine non approuvée) → le sitemap
//     est vide, et ce fichier dit seulement que le site n'est pas encore ouvert à l'indexation ;
//   - build indexable → chaque URL du sitemap, sans capacité `planned`/`wip` ni brouillon, puisque
//     le sitemap les exclut déjà.
// Convention émergente, pas un standard (entity-graph.spec.md) : aucune promesse de traitement.

import { siteConfig } from "@/lib/config/site";
import { renderLlmsTxt } from "@/lib/seo/llms-txt";
import sitemap from "../sitemap";

export const dynamic = "force-static";

export function GET(): Response {
  const urls = siteConfig.allowIndexing ? sitemap().map((entry) => entry.url) : [];
  return new Response(renderLlmsTxt(urls), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
