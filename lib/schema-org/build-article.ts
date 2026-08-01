import { siteConfig } from "@/lib/config/site";
import type { ResolvedDocument } from "@/lib/content/content-loader";

export function buildArticleJsonLd(doc: ResolvedDocument, collection: string) {
  const url = `${siteConfig.origin}/${collection}/${doc.slug}`;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    url,
    headline: doc.frontmatter.title,
    description: doc.frontmatter.description,
    datePublished: doc.frontmatter.publishedAt,
    dateModified: doc.frontmatter.updatedAt,
    inLanguage: doc.frontmatter.language,
    // isPartOf : DÉLIBÉRÉMENT ABSENT. Le nœud WebSite de lib/entity-graph.ts
    // n'a pas d'@id — pointer dessus créerait une référence orpheline.
    // À rétablir seulement si un @id stable est ajouté au nœud WebSite.
  };
}
