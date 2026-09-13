// CSE-2 — authority compiler.
//
// Consumes ResolvedContentSurface and (optionally) a canonical site origin, producing
// downstream metadata for the REFERENCE surface:
//   - Next.js Metadata (title, description, robots, canonical, openGraph, twitter)
//   - a JSON-LD graph (structural nodes selected by policy signals + contentType)
//
// Rules:
//   * Structured data is DOWNSTREAM. It is never a second authoring source. Every claim in
//     JSON-LD must correspond to a visible fact in the resolved surface (visible/schema
//     parity). The compiler does not invent authors, dates, or headlines.
//   * `metadata.effectiveIndexing === "noindex"` MUST produce robots.index=false regardless of
//     policy flags.
//   * FAQPage/HowTo JSON-LD is NEVER emitted here: the current shared block vocabulary does
//     not model FAQ pairs or HowTo steps with the discriminants needed to satisfy that
//     schema's contract. Adding them later must be justified by real semantic blocks, never as
//     an SEO tactic.
//   * `metadata.emitSchemaOrg=false` yields an empty graph.

import type { ResolvedContentSurface } from "../contract/resolved-content-surface";
import { RENDER_VERSION } from "../renderer/reference-renderer";

export interface AuthorityCompileInput {
  resolved: ResolvedContentSurface;
  // The site origin used to build absolute URLs (og:url, JSON-LD @id). If undefined the
  // compiler declines to emit absolute URLs — never a fake one.
  siteOrigin: string | null;
  siteName?: string;
  // Optional resolvers for authorship — the policy chooses whether authors are displayed;
  // this bridge lets a consumer supply the display information without teaching the core
  // about a registry.
  resolveAuthor?: (id: string) => { name: string; sameAs?: readonly string[] } | null;
  // Optional lifecycle facts sourced from the original ContentDocument. The compiler cannot
  // read the document itself (it operates on ResolvedContentSurface), so consumers pass
  // through the dates when they want them reflected in JSON-LD. Absent dates simply do not
  // appear in the graph — never fabricated.
  lifecycle?: {
    publishedAt?: string;
    updatedAt?: string;
    firstPublishedAt?: string;
  };
}

export interface CompiledAuthority {
  renderVersion: typeof RENDER_VERSION;
  metadata: {
    title: string;
    description: string;
    robots: { index: boolean; follow: boolean };
    canonical: string | null;
    openGraph: {
      type: string;
      title: string;
      description: string;
      url: string | null;
      siteName: string | null;
    };
    twitter: {
      card: "summary" | "summary_large_image";
      title: string;
      description: string;
    };
  };
  jsonLd: readonly Record<string, unknown>[];
}

function absoluteUrl(origin: string | null, path: string | null | undefined): string | null {
  if (!origin || !path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = origin.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

// A `contentType` heuristic that maps a producer's contentType string to a schema.org type.
// The renderer never invents a type: the document's `seo.schemaType` (if provided) wins; the
// heuristic only fills a policy-permitted default. Non-article content types get null so no
// Article node is emitted for a changelog entry.
function defaultSchemaType(contentType: string): string | null {
  if (contentType === "product_article" || contentType === "developer_note") return "Article";
  if (contentType === "faq_entry") return "Article";
  return null;
}

export function compileAuthority(input: AuthorityCompileInput): CompiledAuthority {
  const { resolved, siteOrigin } = input;
  const canonical = absoluteUrl(siteOrigin, resolved.metadata.canonicalPath);

  const effectiveIndex =
    resolved.metadata.effectiveIndexing === "index" ? true : false;

  const metadata: CompiledAuthority["metadata"] = {
    title: resolved.title,
    description: resolved.description,
    robots: { index: effectiveIndex, follow: true },
    canonical,
    openGraph: {
      type: "article",
      title: resolved.title,
      description: resolved.description,
      // Draft/noindex must not leak an absolute URL to social crawlers either.
      url: effectiveIndex ? canonical : null,
      siteName: input.siteName ?? null,
    },
    twitter: {
      card: "summary",
      title: resolved.title,
      description: resolved.description,
    },
  };

  if (!resolved.metadata.emitSchemaOrg) {
    return { renderVersion: RENDER_VERSION, metadata, jsonLd: [] };
  }

  const nodes: Record<string, unknown>[] = [];
  const schemaType =
    resolved.metadata.schemaType ?? defaultSchemaType(resolved.contentType);

  if (schemaType) {
    const node: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": schemaType,
      headline: resolved.title,
      description: resolved.description,
      inLanguage: resolved.language,
    };
    // Visible/schema parity: only emit dates the consumer forwarded from the document.
    if (input.lifecycle?.publishedAt) node.datePublished = input.lifecycle.publishedAt;
    if (input.lifecycle?.updatedAt) node.dateModified = input.lifecycle.updatedAt;
    // Author node — only when the policy displays the author AND the consumer can resolve it
    // through the optional registry bridge. Never fabricated.
    if (resolved.authorship.showAuthor && input.resolveAuthor) {
      const authors = resolved.authorship.authorIds
        .map((id) => {
          const person = input.resolveAuthor?.(id);
          if (!person) return null;
          const authorNode: Record<string, unknown> = { "@type": "Person", name: person.name };
          if (person.sameAs && person.sameAs.length > 0) authorNode.sameAs = person.sameAs;
          return authorNode;
        })
        .filter((v): v is Record<string, unknown> => v !== null);
      if (authors.length === 1) node.author = authors[0];
      else if (authors.length > 1) node.author = authors;
    }
    // URL only when canonical is known and index is allowed.
    if (effectiveIndex && canonical) {
      node["@id"] = `${canonical}#${schemaType.toLowerCase()}`;
      node.url = canonical;
    }
    nodes.push(node);
  }

  // Breadcrumb node when the policy shows breadcrumbs and a canonical exists.
  if (resolved.navigation.showBreadcrumbs && effectiveIndex && canonical && siteOrigin) {
    nodes.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteOrigin },
        { "@type": "ListItem", position: 2, name: resolved.title, item: canonical },
      ],
    });
  }

  return { renderVersion: RENDER_VERSION, metadata, jsonLd: nodes };
}
