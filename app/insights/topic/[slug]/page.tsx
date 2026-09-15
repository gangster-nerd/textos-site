// CTO §4 — Real topic hub. Not a whitelisted-regex phantom : this page really exists,
// really renders, really 404s when empty. Production emits a topic hub only when at
// least one PUBLISHED article carries the topic. Preview shows every hub (including
// draft-populated ones) with the same DRAFT semantics as the article route : noindex,
// nofollow, excluded from public link graph.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { siteConfig } from "@/lib/config/site";
import { loadCollection, isIndexable } from "@/lib/content/content-loader";
import type { ContentFrontmatter } from "@/lib/content/content-schema";
import { findTopic, HUB_TOPIC_IDS, TOPICS } from "@/lib/content/topic-registry";
import { serializeJsonLd } from "@/lib/schema-org/serialize";

export const dynamic = "force-static";
export const dynamicParams = false;

const COLLECTION = "insights";

/** Sentinel used when zero topic hubs qualify — keeps generateStaticParams from returning []. */
const EMPTY_HUB_SENTINEL = "__no_topic_hub__";

function docsForTopic(topicId: string) {
  return loadCollection(COLLECTION).filter((d) => {
    const topics = (d.frontmatter as Record<string, unknown>).topicIds as string[] | undefined;
    return topics?.includes(topicId);
  });
}

function publicDocsForTopic(topicId: string) {
  return docsForTopic(topicId).filter(isIndexable);
}

export function generateStaticParams() {
  // Every hubSlug topic is a candidate route ; the actual page-level notFound() gate
  // below removes empty topics AT RENDER time. This keeps generateStaticParams stable
  // whether or not the corpus is populated.
  const hubs = HUB_TOPIC_IDS.map((id) => TOPICS[id]).filter((t) => t.hubSlug);

  if (siteConfig.allowIndexing) {
    // Production : emit only hubs that carry ≥1 published+indexable article. A hub with
    // zero real content is a thin page — do not generate it at all.
    const populated = hubs.filter((t) => publicDocsForTopic(t.id).length > 0);
    if (populated.length === 0) return [{ slug: EMPTY_HUB_SENTINEL }];
    return populated.map((t) => ({ slug: t.hubSlug! }));
  }

  // Preview : emit every hub with a hubSlug — the DRAFT banner + notFound()-on-empty
  // gate at render time enforces honesty.
  if (hubs.length === 0) return [{ slug: EMPTY_HUB_SENTINEL }];
  return hubs.map((t) => ({ slug: t.hubSlug! }));
}

function topicFromHubSlug(hubSlug: string) {
  return HUB_TOPIC_IDS.map((id) => TOPICS[id]).find((t) => t.hubSlug === hubSlug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (slug === EMPTY_HUB_SENTINEL) {
    return { title: "Not found", robots: { index: false, follow: false } };
  }
  const topic = topicFromHubSlug(slug);
  if (!topic) {
    return { title: "Not found", robots: { index: false, follow: false } };
  }
  const canonical = `/insights/topic/${topic.hubSlug}`;
  return {
    title: `${topic.label} — Insights`,
    description: topic.summary,
    ...(siteConfig.allowIndexing
      ? { alternates: { canonical } }
      : {}),
    robots: siteConfig.allowIndexing ? undefined : { index: false, follow: false },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === EMPTY_HUB_SENTINEL) notFound();
  const topic = topicFromHubSlug(slug);
  if (!topic) notFound();

  const docs = siteConfig.allowIndexing
    ? publicDocsForTopic(topic.id)
    : docsForTopic(topic.id);

  // Production : an empty topic hub is a thin page. We refuse to serve one — even a
  // canonical URL for "here is our thinking on X" is dishonest when we have nothing
  // to say on X. Preview keeps rendering empty hubs so editors see the shape.
  if (siteConfig.allowIndexing && docs.length === 0) notFound();

  const path = `/insights/topic/${topic.hubSlug}`;
  const idPrefix = siteConfig.allowIndexing
    ? `${siteConfig.origin}${path}`
    : `urn:textos:topic-hub:${topic.hubSlug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "urn:textos:org",
        name: "TextOS",
        ...(siteConfig.allowIndexing ? { url: siteConfig.origin } : {}),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${idPrefix}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "TextOS" },
          { "@type": "ListItem", position: 2, name: "Insights" },
          { "@type": "ListItem", position: 3, name: topic.label },
        ].map((it, i) => {
          if (siteConfig.allowIndexing) {
            const href = i === 0 ? "/" : i === 1 ? "/insights" : path;
            return { ...it, item: `${siteConfig.origin}${href}` };
          }
          return it;
        }),
      },
      {
        "@type": "CollectionPage",
        "@id": `${idPrefix}#collection`,
        name: `${topic.label} — Insights`,
        description: topic.summary,
        inLanguage: "en",
        publisher: { "@id": "urn:textos:org" },
        ...(siteConfig.allowIndexing
          ? { url: `${siteConfig.origin}${path}` }
          : {}),
        hasPart: docs.map((d) => ({
          "@type": "WebPage",
          name: (d.frontmatter as ContentFrontmatter).title,
          url: siteConfig.allowIndexing
            ? `${siteConfig.origin}${d.path}`
            : d.path,
        })),
        numberOfItems: docs.length,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <main className="topic-hub">
        <nav className="doc__breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li>
              <Link href="/">TextOS</Link>
            </li>
            <li>
              <Link href="/insights">Insights</Link>
            </li>
            <li>
              <span aria-current="page">{topic.label}</span>
            </li>
          </ol>
        </nav>
        <header className="topic-hub__head">
          <p className="kicker">Topic</p>
          <h1>{topic.label}</h1>
          <p className="lede">{topic.summary}</p>
        </header>

        {docs.length === 0 ? (
          <section aria-labelledby="empty-topic-hub" data-empty-state="topic-hub">
            <h2 id="empty-topic-hub">Nothing published yet on this topic</h2>
            <p>
              This hub is honest about its current state — it does not manufacture
              placeholder articles. When an article is written and published against
              this topic, it will appear here.
            </p>
          </section>
        ) : (
          <ul className="topic-hub__list">
            {docs.map((d) => {
              const fm = d.frontmatter as ContentFrontmatter & Record<string, unknown>;
              return (
                <li key={d.slug}>
                  <Link href={d.path}>{fm.title}</Link>
                  <p className="data-label">{fm.description}</p>
                  {fm.editorialStatus !== "published" && (
                    <span className="badge" data-role="draft-badge">
                      draft · not public
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
