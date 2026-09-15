import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { siteConfig } from "@/lib/config/site";
import {
  listPublishedSlugs,
  loadCollection,
  loadDocument,
  listSlugs,
} from "@/lib/content/content-loader";
import type { ContentFrontmatter } from "@/lib/content/content-schema";
import { findPerson } from "@/lib/content/author-registry";
import { findTopic } from "@/lib/content/topic-registry";
import {
  countWords,
  extractHeadings,
  insightBreadcrumb,
  readingTimeMinutes,
  scoreRelated,
  shouldRenderToc,
  slugifyHeading,
  type Heading,
} from "@/lib/content/article-derivations";
import { buildInsightArticleGraph } from "@/lib/schema-org/build-article-graph";
import { serializeJsonLd } from "@/lib/schema-org/serialize";
import { ContentCta } from "@/components/content/ContentCta";

const COLLECTION = "insights";

export const dynamic = "force-static";
export const dynamicParams = false;

const EMPTY_COLLECTION_SENTINEL = "__empty_collection__";

export function generateStaticParams() {
  const slugs = siteConfig.allowIndexing
    ? listPublishedSlugs(COLLECTION)
    : listSlugs(COLLECTION);
  if (slugs.length === 0) return [{ slug: EMPTY_COLLECTION_SENTINEL }];
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (slug === EMPTY_COLLECTION_SENTINEL) {
    return { title: "Not found", robots: { index: false, follow: false } };
  }
  const doc = loadDocument(COLLECTION, slug);
  const fm = doc.frontmatter as ContentFrontmatter & Record<string, unknown>;
  const authorId = fm.authorId as string | undefined;
  const author = authorId ? findPerson(authorId) : undefined;
  const image = fm.image as
    | { src: string; alt: string; width: number; height: number }
    | undefined;
  const imageUrl = image
    ? siteConfig.allowIndexing
      ? `${siteConfig.origin}${image.src}`
      : image.src
    : undefined;
  const publicPublished =
    siteConfig.allowIndexing && doc.frontmatter.editorialStatus === "published";
  return {
    title: doc.frontmatter.title,
    description: doc.frontmatter.description,
    ...(publicPublished
      ? {
          alternates: { canonical: `/${COLLECTION}/${slug}` },
          openGraph: {
            type: "article",
            title: doc.frontmatter.title,
            description: doc.frontmatter.description,
            publishedTime: (fm.firstPublishedAt as string | undefined) ?? undefined,
            modifiedTime:
              (fm.lastReviewedAt as string | undefined) ??
              (fm.firstPublishedAt as string | undefined) ??
              undefined,
            authors: author ? [author.name] : undefined,
            images: image
              ? [
                  {
                    url: imageUrl!,
                    width: image.width,
                    height: image.height,
                    alt: image.alt,
                  },
                ]
              : undefined,
          },
          twitter: {
            card: "summary_large_image",
            title: doc.frontmatter.title,
            description: doc.frontmatter.description,
            images: image ? [imageUrl!] : undefined,
          },
        }
      : {}),
    // CTO §2 : un draft ne doit ni être indexé ni être suivi. `follow: true` sur un draft
    // laisserait les crawlers découvrir la page via des liens accidentels et propager son
    // « poids » (aussi faible soit-il) vers ses cibles. Draft = pas de trace publique.
    robots:
      doc.frontmatter.editorialStatus !== "published"
        ? { index: false, follow: false }
        : doc.frontmatter.indexingPolicy === "noindex"
          ? { index: false, follow: true }
          : undefined,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === EMPTY_COLLECTION_SENTINEL) notFound();

  const doc = loadDocument(COLLECTION, slug);
  // CTO §2 : ceinture-et-bretelles. `generateStaticParams` filtre déjà les drafts en
  // Production (via `listPublishedSlugs`), donc en théorie ce chemin n'est jamais atteint
  // pour un draft quand `allowIndexing=true`. Le garde ci-dessous est le filet : si un
  // draft s'inscrivait au static export d'une build indexable pour quelque raison, on
  // renvoie 404 plutôt que de servir un contenu non prêt.
  if (siteConfig.allowIndexing && doc.frontmatter.editorialStatus !== "published") {
    notFound();
  }
  const fm = doc.frontmatter as ContentFrontmatter & Record<string, unknown>;

  const headings = extractHeadings(doc.body, { includeH3: false });
  const wc = countWords(doc.body);
  const readingTime = readingTimeMinutes(doc.body);
  const breadcrumb = insightBreadcrumb(doc.slug, doc.frontmatter.title);
  const showToc = shouldRenderToc(headings);

  const authorId = fm.authorId as string | undefined;
  const author = authorId ? findPerson(authorId) : undefined;
  const reviewerIds = (fm.reviewerIds as string[] | undefined) ?? [];
  const reviewers = reviewerIds.map(findPerson).filter(Boolean);

  const primaryTopicId = fm.primaryTopicId as string | undefined;
  const primaryTopic = primaryTopicId ? findTopic(primaryTopicId) : undefined;

  const jsonLdGraph = buildInsightArticleGraph({ doc, headings });

  // Related content — deterministic scoring, no arbitrary slice.
  const allDocs = loadCollection(COLLECTION);
  const related = scoreRelated({ target: doc, candidates: allDocs }).slice(0, 6);

  // Freshness / status label.
  const truthMode = fm.truthMode as string | undefined;
  const editorialClass = fm.editorialClass as string | undefined;
  const disclaimer = fm.disclaimer as string | undefined;
  const firstPublishedAt = fm.firstPublishedAt as string | null | undefined;
  const lastReviewedAt = fm.lastReviewedAt as string | undefined;
  const revisionNumber = (fm.revisionNumber as number | undefined) ?? 0;
  const revisionSummary = fm.revisionSummary as string | undefined;

  // CTO §5 — ONE heading-id source of truth. `extractHeadings` already disambiguates
  // duplicate H2 titles (`section`, `section-2`, `section-3`). We reuse ITS output
  // instead of recomputing IDs in the Markdown renderer. A per-render counter mirrors
  // extractHeadings's occurrence-based disambiguation so the Nth occurrence of the same
  // slugified text gets the Nth id — exactly one DOM element per ToC fragment.
  const h2SeenCount = new Map<string, number>();
  const h2IdForOccurrence = (text: string): string => {
    const base = slugifyHeading(text);
    const seen = h2SeenCount.get(base) ?? 0;
    h2SeenCount.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen + 1}`;
  };
  const markdownComponents = {
    h2: ({ children }: { children?: React.ReactNode }) => {
      const text = String(children ?? "");
      const id = h2IdForOccurrence(text);
      return (
        <h2 id={id}>
          <a href={`#${id}`} className="doc__heading-anchor" aria-label={`Link to ${text}`}>
            {children}
          </a>
        </h2>
      );
    },
  } as const;

  // CTO §6 — Split the body at the contextual CTA marker. Placement is EDITORIAL, not
  // automatic : the marker sits at the position the writer chose. If a CTA resolves but
  // no marker exists, we do NOT render a contextual CTA (verifier warns at build time
  // via insight-verifier).
  const CTA_MARKER = "<!-- cta:contextual -->";
  const markerIndex = doc.body.indexOf(CTA_MARKER);
  const hasContextualMarker = markerIndex !== -1;
  const bodyBeforeCta = hasContextualMarker ? doc.body.slice(0, markerIndex) : doc.body;
  const bodyAfterCta = hasContextualMarker ? doc.body.slice(markerIndex + CTA_MARKER.length) : "";
  const shouldRenderCta =
    doc.ctaResolution.resolvedVariant !== null &&
    doc.ctaResolution.resolvedVariant !== "none";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLdGraph) }}
      />
      <main className="doc">
        {/* CTO §2 — Draft = pas public. Bandeau visible dès qu'un article n'est pas
            `editorialStatus=published`, quelle que soit la surface qui le sert (Preview
            ou dev local — la Production n'atteindra jamais ce chemin via
            generateStaticParams + le garde notFound() ci-dessus). Explicite, court,
            impossible à confondre avec du contenu de première ligne. */}
        {doc.frontmatter.editorialStatus !== "published" && (
          <aside
            className="doc__draft-banner"
            role="note"
            aria-label="Draft banner"
            data-role="draft-banner"
          >
            <strong>DRAFT · NOT PUBLIC</strong>
            <span>
              This article has not been published. It is served to reviewers only,
              carries robots noindex/nofollow, and is excluded from listings, sitemap,
              related content and topic hubs in Production.
            </span>
          </aside>
        )}
        {/* Breadcrumb */}
        <nav className="doc__breadcrumb" aria-label="Breadcrumb">
          <ol>
            {breadcrumb.map((c, i) => (
              <li key={c.href}>
                {i < breadcrumb.length - 1 ? (
                  <Link href={c.href}>{c.label}</Link>
                ) : (
                  <span aria-current="page">{c.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <article>
          <header className="doc__head">
            {primaryTopic && (
              <p className="kicker">
                <Link href={primaryTopic.hubSlug ? `/insights/topic/${primaryTopic.hubSlug}` : "/insights"}>
                  {primaryTopic.label}
                </Link>
              </p>
            )}
            <h1>{doc.frontmatter.title}</h1>
            <p className="doc__lede">{doc.frontmatter.description}</p>

            <div className="doc__meta" role="group" aria-label="Article metadata">
              {author && (
                <span>
                  <span className="data-label">Author</span> {author.name}
                </span>
              )}
              {reviewers.length > 0 && (
                <span>
                  <span className="data-label">Reviewed by</span>{" "}
                  {reviewers.map((r) => r?.name).join(", ")}
                </span>
              )}
              {firstPublishedAt && (
                <span>
                  <span className="data-label">First published</span> {firstPublishedAt}
                </span>
              )}
              <span>
                <span className="data-label">Last updated</span> {doc.frontmatter.updatedAt}
              </span>
              {lastReviewedAt && lastReviewedAt !== doc.frontmatter.updatedAt && (
                <span>
                  <span className="data-label">Last reviewed</span> {lastReviewedAt}
                </span>
              )}
              <span>
                <span className="data-label">Reading time</span> {readingTime} min · {wc.toLocaleString()} words
              </span>
              {editorialClass && (
                <span data-editorial-class={editorialClass}>
                  <span className="data-label">Editorial class</span>{" "}
                  {editorialClass.replace(/_/g, " ").toLowerCase()}
                </span>
              )}
              {truthMode && (
                <span data-truth-mode={truthMode}>
                  <span className="data-label">Truth mode</span> {truthMode.toLowerCase()}
                </span>
              )}
            </div>

            {editorialClass === "ROADMAP_DIRECTION" && disclaimer && (
              <p className="doc__disclaimer" role="note" data-role="roadmap-disclaimer">
                {disclaimer}
              </p>
            )}
            {editorialClass === "COMPANY_TECHNOLOGY" && (
              <p className="doc__status" role="note" data-role="company-technology">
                <span className="data-label">How we build</span> This is an internal engineering
                narrative, not a customer feature.
              </p>
            )}
          </header>

          <section className="doc__short" aria-labelledby="short-answer">
            <h2 id="short-answer" className="data-label">
              In short
            </h2>
            <p className="lede">{doc.frontmatter.shortAnswer.body}</p>
          </section>

          {showToc && (
            <nav className="doc__toc" aria-label="Table of contents">
              <p className="data-label">Contents</p>
              <ol>
                {headings.map((h) => (
                  <li key={h.id} data-toc-level={h.level}>
                    <a href={`#${h.id}`}>{h.text}</a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {bodyBeforeCta}
          </Markdown>

          {/* CTO §6 — Contextual CTA rendered AT the editorial marker position, not
              after the whole body. The writer chose the placement ; we honour it. */}
          {shouldRenderCta && hasContextualMarker && (
            <ContentCta
              variant={doc.ctaResolution.resolvedVariant}
              contentId={doc.contentId}
              position="contextual"
              clusterId={doc.frontmatter.clusterId}
            />
          )}

          {hasContextualMarker && (
            <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {bodyAfterCta}
            </Markdown>
          )}

          <footer className="doc__provenance" aria-label="Provenance and method">
            <h2>Provenance</h2>
            <p>
              This article was written against product SHA{" "}
              <code>{doc.frontmatter.productSnapshotSha}</code>
              {truthMode ? ` — truth mode: ${truthMode}.` : "."}
            </p>
            {revisionNumber > 0 && (
              <p>
                <span className="data-label">Revision</span> {revisionNumber}
                {revisionSummary ? ` — ${revisionSummary}` : ""}
              </p>
            )}
          </footer>

          {related.length > 0 && (
            <nav className="doc__related" aria-label="Related insights">
              <h2>Related insights</h2>
              <ul>
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link href={r.href}>{r.title}</Link>
                    <p className="data-label">{r.reasons.join(" · ")}</p>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {/* Final CTA — same variant, different position, deliberate repetition at the end. */}
          {doc.ctaResolution.resolvedVariant &&
            doc.ctaResolution.resolvedVariant !== "none" && (
              <ContentCta
                variant={doc.ctaResolution.resolvedVariant}
                contentId={doc.contentId}
                position="final"
                clusterId={doc.frontmatter.clusterId}
              />
            )}

          {author && (
            <section className="doc__author-card" aria-label="Author">
              <h2>About the author</h2>
              <p>
                <strong>{author.name}</strong>
                {author.role ? <> — {author.role}</> : null}
              </p>
            </section>
          )}
        </article>
      </main>
    </>
  );
}
