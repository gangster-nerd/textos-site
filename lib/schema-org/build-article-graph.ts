// CTC-ARTICLE-SYSTEM-1 §5 — JSON-LD @graph builder for /insights articles.
//
// Contract :
//   - Draft article → emit WebPage graph only. NO Article-family node, NO datePublished,
//     NO dateModified. Publisher, breadcrumb, author are optional context.
//   - Published article → emit Article/TechArticle/BlogPosting. datePublished MUST be
//     `firstPublishedAt` (non-null). dateModified is `lastReviewedAt ?? firstPublishedAt`.
//     NO fallback to the legacy `publishedAt` field.
//   - Never emit properties whose values are unknown.
//   - Never emit absolute URLs when `siteConfig.allowIndexing` is false.
//
// The doctrine here is: structured data must reflect what is *visibly on the page*, and
// the page has no publication date until firstPublishedAt is real.

import { siteConfig } from "@/lib/config/site";
import type { ResolvedDocument } from "@/lib/content/content-loader";
import type { ContentFrontmatter } from "@/lib/content/content-schema";
import { findPerson, type Entity } from "@/lib/content/author-registry";
import { findTopic } from "@/lib/content/topic-registry";
import type { Heading } from "@/lib/content/article-derivations";
import { countWords, insightBreadcrumb } from "@/lib/content/article-derivations";

interface BuildArgs {
  doc: ResolvedDocument;
  headings: Heading[];
}

type ArticleImage = { src: string; alt: string; width: number; height: number };

export function buildInsightArticleGraph(args: BuildArgs) {
  const { doc } = args;
  const fm = doc.frontmatter as ContentFrontmatter & Record<string, unknown>;
  const status = fm.editorialStatus as string;
  const isPublished = status === "published";

  const nodes: Record<string, unknown>[] = [];

  // ── Organization (publisher). Stable URN @id even without origin.
  nodes.push({
    "@type": "Organization",
    "@id": "urn:textos:org",
    name: "TextOS",
    description: "Authority observatory for AI answer engines.",
    ...(siteConfig.allowIndexing ? { url: siteConfig.origin } : {}),
  });

  // ── WebSite (only when we have a real origin).
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

  // ── Author entity (Person or Organization). Only emitted if the id resolves.
  const authorId = fm.authorId as string | undefined;
  const author = authorId ? findPerson(authorId) : undefined;
  if (author) {
    nodes.push(entityNode(author));
  }

  // ── BreadcrumbList.
  const breadcrumbItems = insightBreadcrumb(doc.slug, doc.frontmatter.title);
  nodes.push({
    "@type": "BreadcrumbList",
    "@id": `${idPrefix(doc)}#breadcrumb`,
    itemListElement: breadcrumbItems
      .map((c, i) => {
        const item: Record<string, unknown> = {
          "@type": "ListItem",
          position: i + 1,
          name: c.label,
        };
        if (siteConfig.allowIndexing) {
          item.item = `${siteConfig.origin}${c.href}`;
        }
        return item;
      }),
  });

  if (!isPublished) {
    // ── DRAFT: WebPage node only. No date properties. No Article family type.
    // Anyone reading the JSON-LD sees "this is a page that exists" and NOTHING that would
    // let a crawler treat it as a dated, authored publication.
    nodes.push({
      "@type": "WebPage",
      "@id": `${idPrefix(doc)}#webpage`,
      name: doc.frontmatter.title,
      description: doc.frontmatter.description,
      inLanguage: doc.frontmatter.language,
      publisher: { "@id": "urn:textos:org" },
      ...(siteConfig.allowIndexing
        ? { url: `${siteConfig.origin}${doc.path}`, isPartOf: { "@id": `${siteConfig.origin}#website` } }
        : {}),
    });
    return { "@context": "https://schema.org", "@graph": nodes };
  }

  // ── PUBLISHED path.
  const firstPublishedAt = fm.firstPublishedAt as string | null | undefined;
  if (!firstPublishedAt) {
    // The verifier already rejects published-without-firstPublishedAt, but this module
    // is called from other paths too (tests, ad-hoc pipelines). Fail loudly rather than
    // fabricate a date.
    throw new Error(
      `buildInsightArticleGraph: published article ${doc.slug} has null firstPublishedAt.`,
    );
  }
  const lastReviewedAt = fm.lastReviewedAt as string | null | undefined;
  const schemaType = (fm.schemaType as string | undefined) ?? "Article";
  const primaryTopicId = fm.primaryTopicId as string | undefined;
  const primaryTopic = primaryTopicId ? findTopic(primaryTopicId) : undefined;
  const image = fm.image as ArticleImage | undefined;
  const wc = countWords(doc.body);

  const articleNode: Record<string, unknown> = {
    "@type": schemaType,
    "@id": `${idPrefix(doc)}#article`,
    headline: doc.frontmatter.title,
    description: doc.frontmatter.description,
    datePublished: firstPublishedAt,
    dateModified: lastReviewedAt ?? firstPublishedAt,
    inLanguage: doc.frontmatter.language,
    wordCount: wc,
    ...(primaryTopic ? { about: primaryTopic.label, articleSection: primaryTopic.label } : {}),
    publisher: { "@id": "urn:textos:org" },
    ...(author ? { author: { "@id": entityId(author) } } : {}),
    ...(image
      ? {
          image: {
            "@type": "ImageObject",
            url: siteConfig.allowIndexing ? `${siteConfig.origin}${image.src}` : image.src,
            width: image.width,
            height: image.height,
          },
        }
      : {}),
    ...(siteConfig.allowIndexing
      ? {
          url: `${siteConfig.origin}${doc.path}`,
          mainEntityOfPage: `${siteConfig.origin}${doc.path}`,
          isPartOf: { "@id": `${siteConfig.origin}#website` },
        }
      : {}),
  };

  nodes.push(articleNode);

  return { "@context": "https://schema.org", "@graph": nodes };
}

function entityId(e: Entity): string {
  return e.profilePath && siteConfig.allowIndexing
    ? `${siteConfig.origin}${e.profilePath}#${e.entityType.toLowerCase()}`
    : `urn:textos:${e.entityType.toLowerCase()}:${e.id}`;
}

function entityNode(e: Entity): Record<string, unknown> {
  const node: Record<string, unknown> = {
    "@type": e.entityType,
    "@id": entityId(e),
    name: e.name,
    ...(e.entityType === "Person" ? { jobTitle: e.role } : { description: e.role }),
  };
  if (e.entityType === "Person") {
    node.worksFor = { "@id": "urn:textos:org" };
  }
  if (e.sameAs && e.sameAs.length) {
    node.sameAs = e.sameAs;
  }
  if (e.profilePath && siteConfig.allowIndexing) {
    node.url = `${siteConfig.origin}${e.profilePath}`;
  }
  return node;
}

function idPrefix(doc: ResolvedDocument): string {
  return siteConfig.allowIndexing
    ? `${siteConfig.origin}${doc.path}`
    : `urn:textos:content:${doc.contentId}`;
}
