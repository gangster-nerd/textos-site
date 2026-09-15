// A2 — authority compiler.
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
//
// AUTHORITY AUDIT (A3, phase 3): factually-justified mapping is DELIBERATELY narrow.
//
//   * product_article  → "Article"       — long-form editorial artefact; JSON-LD Article
//                                          faithfully represents the shape.
//   * every other type → null            — no automatic mapping.
//
// Previously `developer_note` and `faq_entry` were mapped to "Article" purely because they
// contained text. That is not a factual justification. In particular:
//   - `faq_entry` maps naturally to FAQPage, but FAQPage requires structured Q/A pairs the
//     shared block vocabulary does NOT model. Emitting Article for a FAQ entry would misstate
//     the content shape; emitting FAQPage without Q/A discriminants would be an SEO tactic.
//     A future FAQ profile with real `faq_pair` blocks may revisit this — for now, null.
//   - `developer_note` is a governed short-form note that neither matches Article (no
//     headline/date guarantees) nor any other schema.org type. null is correct.
//
// The producer can still opt in explicitly: `document.seo.schemaType` (if provided) wins,
// letting a policy override the heuristic when factually warranted.
function defaultSchemaType(contentType: string): string | null {
  if (contentType === "product_article") return "Article";
  return null;
}

export function compileAuthority(input: AuthorityCompileInput): CompiledAuthority {
  const { resolved, siteOrigin } = input;
  const canonical = absoluteUrl(siteOrigin, resolved.metadata.canonicalPath);

  const effectiveIndex =
    resolved.metadata.effectiveIndexing === "index" ? true : false;

  // Pre-decide the schema type so OpenGraph type stays aligned with the same factual/policy
  // boundary as JSON-LD. og:type="article" is emitted ONLY when this compilation actually
  // produces a schema.org Article node; every other case falls back to og:type="website".
  const schemaTypeCandidate = resolved.metadata.emitSchemaOrg
    ? resolved.metadata.schemaType ?? defaultSchemaType(resolved.contentType)
    : null;
  const willEmitArticle = schemaTypeCandidate === "Article";
  const ogType = willEmitArticle ? "article" : "website";

  const metadata: CompiledAuthority["metadata"] = {
    title: resolved.title,
    description: resolved.description,
    robots: { index: effectiveIndex, follow: true },
    canonical,
    openGraph: {
      type: ogType,
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
  const schemaType = schemaTypeCandidate;

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
