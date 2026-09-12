import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { siteConfig } from "@/lib/config/site";
import { listPublishedSlugs, loadCollection, loadDocument, listSlugs } from "@/lib/content/content-loader";
import type { ContentFrontmatter } from "@/lib/content/content-schema";
import { buildArticleJsonLd } from "@/lib/schema-org/build-article";
import { serializeJsonLd } from "@/lib/schema-org/serialize";
import { ContentCta } from "@/components/content/ContentCta";

const COLLECTION = "insights";

export const dynamic = "force-static";
export const dynamicParams = false;

// Sentinel unique pour output:export : la config `output: "export"` (next.config.mjs) exige
// que `generateStaticParams` retourne au moins UNE entrée. Quand la collection est vide
// (CTC-9A avant que la vague CTC-9B ne pose ses articles), on rend une page "not_found"
// discrète plutôt que de laisser le build échouer. Cette page n'est jamais linkée depuis
// /insights (index) — elle est purement structurelle.
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
  return {
    title: doc.frontmatter.title,
    description: doc.frontmatter.description,
    ...(siteConfig.allowIndexing
      ? { alternates: { canonical: `/${COLLECTION}/${slug}` } }
      : {}),
    robots:
      doc.frontmatter.indexingPolicy === "noindex"
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
  if (slug === EMPTY_COLLECTION_SENTINEL) {
    notFound();
  }
  const doc = loadDocument(COLLECTION, slug);
  const jsonLd = buildArticleJsonLd(doc, COLLECTION);
  const fm = doc.frontmatter as ContentFrontmatter & {
    editorialClass?: string;
    truthMode?: string;
    disclaimer?: string;
  };

  const siblings = loadCollection(COLLECTION)
    .filter((d) => d.slug !== doc.slug)
    .slice(0, 6)
    .map((d) => ({ href: d.path, title: d.frontmatter.title }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <main>
        <article className="doc">
          <header className="doc__head">
            <p className="kicker">
              {fm.editorialClass ? fm.editorialClass.replace(/_/g, " ").toLowerCase() : "Insights"}
            </p>
            <h1>{doc.frontmatter.title}</h1>
            {fm.editorialClass === "ROADMAP_DIRECTION" && fm.disclaimer && (
              <p className="doc__disclaimer" role="note" data-role="roadmap-disclaimer">
                {fm.disclaimer}
              </p>
            )}
            {fm.editorialClass === "COMPANY_TECHNOLOGY" && (
              <p className="doc__status" role="note" data-role="company-technology">
                <span className="data-label">How we build</span> This is an internal engineering
                narrative, not a customer feature.
              </p>
            )}
            {doc.maturityLabels.map((label) => (
              <p key={label} className="doc__status" role="note">
                <span className="data-label">Status</span> {label}
              </p>
            ))}
          </header>

          <section className="doc__short" aria-labelledby="short-answer">
            <h2 id="short-answer" className="data-label">
              In short
            </h2>
            <p className="lede">{doc.frontmatter.shortAnswer.body}</p>
          </section>

          <Markdown remarkPlugins={[remarkGfm]}>{doc.body}</Markdown>

          <footer className="doc__provenance" aria-label="Source">
            <p>
              Written against product SHA <code>{doc.frontmatter.productSnapshotSha}</code>
              {fm.truthMode ? ` — truth mode: ${fm.truthMode}` : ""}
              {fm.editorialClass ? `, editorial class: ${fm.editorialClass}` : ""}.
            </p>
          </footer>
        </article>

        <ContentCta
          variant={doc.ctaResolution.resolvedVariant}
          contentId={doc.contentId}
          position="end"
        />

        {siblings.length > 0 && (
          <nav aria-label="More insights">
            <h2>More insights</h2>
            <ul>
              {siblings.map((s) => (
                <li key={s.href}>
                  <Link href={s.href}>{s.title}</Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </main>
    </>
  );
}
