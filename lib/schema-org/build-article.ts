import { siteConfig } from "@/lib/config/site";
import type { ResolvedDocument } from "@/lib/content/content-loader";

export function buildArticleJsonLd(doc: ResolvedDocument, collection: string) {
  const node = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: doc.frontmatter.title,
    description: doc.frontmatter.description,
    datePublished: doc.frontmatter.publishedAt,
    dateModified: doc.frontmatter.updatedAt,
    inLanguage: doc.frontmatter.language,
    // isPartOf : DÉLIBÉRÉMENT ABSENT. Le nœud WebSite de lib/entity-graph.ts
    // n'a pas d'@id — pointer dessus créerait une référence orpheline.
    // À rétablir seulement si un @id stable est ajouté au nœud WebSite.
  };

  // Origine provisoire (allowIndexing=false) : aucune auto-référence absolue.
  // @id/url pointeraient vers localhost ou une URL qui 404 — un mensonge.
  // Une valeur inconnue se déclare absente, jamais fausse ("not observable,
  // never zero" appliqué à l'identité du nœud). Rétablis dès qu'une origine
  // réelle et indexable est tranchée.
  if (!siteConfig.allowIndexing) {
    return node;
  }

  const url = `${siteConfig.origin}/${collection}/${doc.slug}`;
  return { ...node, "@id": `${url}#article`, url };
}
