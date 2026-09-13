// CTC-ARTICLE-SYSTEM-1 §5 — JSON-LD @graph builder for /insights articles.
//
// Contract :
//   - stable @id values ;
//   - never emit properties whose values are unknown ;
//   - never emit structured data not visibly reflected on the page (author, dates, breadcrumb) ;
//   - do not mass-apply FAQPage or HowTo ;
//   - do not emit absolute URLs when siteConfig.allowIndexing is false (origin is provisional).

import { siteConfig } from "@/lib/config/site";
import type { ResolvedDocument } from "@/lib/content/content-loader";
import type { ContentFrontmatter } from "@/lib/content/content-schema";
import { findPerson, type Person } from "@/lib/content/author-registry";
import { findTopic } from "@/lib/content/topic-registry";
import type { Heading } from "@/lib/content/article-derivations";
import { countWords, insightBreadcrumb } from "@/lib/content/article-derivations";

interface BuildArgs {
  doc: ResolvedDocument;
  headings: Heading[];
}

export function buildInsightArticleGraph(args: BuildArgs) {
  const { doc } = args;
  const fm = doc.frontmatter as ContentFrontmatter & Record<string, unknown>;
  const schemaType = (fm.schemaType as string | undefined) ?? "Article";
  const authorId = fm.authorId as string | undefined;
  const author = authorId ? findPerson(authorId) : undefined;
  const primaryTopicId = fm.primaryTopicId as string | undefined;
  const primaryTopic = primaryTopicId ? findTopic(primaryTopicId) : undefined;

  const nodes: Record<string, unknown>[] = [];

  // ── Organization (publisher). Included even without origin — @id is a stable URN.
  nodes.push({
    "@type": "Organization",
    "@id": "urn:textos:org",
    name: "TextOS",
    description: "Authority observatory for AI answer engines.",
    ...(siteConfig.allowIndexing ? { url: siteConfig.origin } : {}),
  });

  // ── WebSite (only when we have an origin).
  if (siteConfig.allowIndexing) {
    nodes.push({
      "@type": "WebSite",
      "@id": `${siteConfig.origin}#website`,
      name: "TextOS",
      url: siteConfig.origin,
      publisher: { "@id": "urn:textos:org" },
      inLanguage: doc.frontmatter.language,
    });
  }

  // ── Author (Person or Organization).
  if (author) {
    nodes.push(personNode(author));
  }

  // ── BreadcrumbList.
  const breadcrumbItems = insightBreadcrumb(doc.slug, doc.frontmatter.title);
  nodes.push({
    "@type": "BreadcrumbList",
    "@id": `${idPrefix(doc)}#breadcrumb`,
    itemListElement: breadcrumbItems.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      // Absolute URL only if we have an origin ; relative otherwise.
      item: siteConfig.allowIndexing ? `${siteConfig.origin}${c.href}` : undefined,
    })).map((it) => {
      // Strip undefined item to satisfy "never emit unknown properties".
      if (it.item === undefined) {
        const { item: _drop, ...rest } = it;
        return rest;
      }
      return it;
    }),
  });

  // ── Article / TechArticle / BlogPosting.
  const wc = countWords(doc.body);
  const articleNode: Record<string, unknown> = {
    "@type": schemaType,
    "@id": `${idPrefix(doc)}#article`,
    headline: doc.frontmatter.title,
    description: doc.frontmatter.description,
    datePublished: fm.firstPublishedAt ?? doc.frontmatter.publishedAt,
    dateModified: doc.frontmatter.updatedAt,
    inLanguage: doc.frontmatter.language,
    wordCount: wc,
    ...(primaryTopic ? { about: primaryTopic.label, articleSection: primaryTopic.label } : {}),
    publisher: { "@id": "urn:textos:org" },
    ...(author ? { author: { "@id": personId(author) } } : {}),
    ...(siteConfig.allowIndexing
      ? {
          url: `${siteConfig.origin}${doc.path}`,
          mainEntityOfPage: `${siteConfig.origin}${doc.path}`,
          isPartOf: { "@id": `${siteConfig.origin}#website` },
        }
      : {}),
  };
  // firstPublishedAt is null before real publication ; if null we still show publishedAt from
  // frontmatter, but if BOTH are absent we drop the property (never emit unknown).
  if (!articleNode.datePublished) delete articleNode.datePublished;

  nodes.push(articleNode);

  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}

function personId(p: Person): string {
  return p.profilePath && siteConfig.allowIndexing
    ? `${siteConfig.origin}${p.profilePath}#person`
    : `urn:textos:person:${p.id}`;
}

function personNode(p: Person): Record<string, unknown> {
  return {
    "@type": "Person",
    "@id": personId(p),
    name: p.name,
    jobTitle: p.role,
    worksFor: { "@id": "urn:textos:org" },
    ...(p.sameAs && p.sameAs.length ? { sameAs: p.sameAs } : {}),
    ...(p.profilePath && siteConfig.allowIndexing
      ? { url: `${siteConfig.origin}${p.profilePath}` }
      : {}),
  };
}

function idPrefix(doc: ResolvedDocument): string {
  return siteConfig.allowIndexing ? `${siteConfig.origin}${doc.path}` : `urn:textos:content:${doc.contentId}`;
}
