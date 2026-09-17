// A3R §7 — CSE-backed topic hub route.
//
// The topic hub is a thin adapter over the governed CSE read model :
//   - governed topic id = slug
//   - list of matching insights derived from `topic-catalog`
//   - PUBLIC/indexable eligibility is derived from the 4-gate INDEXABLE set
//     for the current build ; not from filesystem heuristics
//
// Preview may render topic hubs for editorial review ; production only renders
// hubs that carry ≥1 four-gate INDEXABLE article, and never surfaces draft
// targets. The empty-hub state fails cleanly with notFound() in Production.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { siteConfig } from "@/lib/config/site";
import { previewVisibility } from "@/lib/config/preview-visibility";
import {
  listGovernedTopics,
  documentsForTopic,
} from "@/lib/content-surface-engine/site-integration";
import { serializeJsonLd } from "@/lib/schema-org/serialize";

export const dynamic = "force-static";
export const dynamicParams = false;

const EMPTY_TOPIC_SENTINEL = "__no_topic__";

export function generateStaticParams() {
  const topics = listGovernedTopics();
  if (topics.length === 0) return [{ slug: EMPTY_TOPIC_SENTINEL }];
  return topics.map((t) => ({ slug: t.slug }));
}

function humanLabel(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (slug === EMPTY_TOPIC_SENTINEL) {
    return { title: "Not found", robots: { index: false, follow: false } };
  }
  const label = humanLabel(slug);
  const canonical = `/insights/topic/${slug}`;
  const docs = documentsForTopic(slug);
  const hasPublic = docs.some(
    (d) => d.truth.publicationStatus === "published" && d.seo.indexingIntent === "index",
  );
  return {
    title: `${label} — Insights`,
    description: `TextOS insights on ${label.toLowerCase()}.`,
    ...(siteConfig.allowIndexing && hasPublic
      ? { alternates: { canonical } }
      : {}),
    robots:
      siteConfig.allowIndexing && hasPublic
        ? undefined
        : { index: false, follow: siteConfig.allowIndexing },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === EMPTY_TOPIC_SENTINEL) notFound();

  const label = humanLabel(slug);
  const allDocs = documentsForTopic(slug);
  // PR21 §3 : draft visibility governs listing ; indexability governs sitemap
  // and JSON-LD dates. Public builds without preview authorisation never list
  // drafts, regardless of indexing state.
  const publicOnly = !previewVisibility.showDraftContent;
  if (allDocs.length === 0 && publicOnly) notFound();
  const visible = publicOnly
    ? allDocs.filter(
        (d) =>
          d.truth.publicationStatus === "published" &&
          d.seo.indexingIntent === "index",
      )
    : allDocs;

  // Empty public hub → 404 in public builds ; render honest empty state in Preview.
  if (publicOnly && visible.length === 0) notFound();

  const canonical = `/insights/topic/${slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "urn:textos:org",
        name: "TextOS",
      },
      {
        "@type": "CollectionPage",
        "@id": `urn:textos:topic-hub:${slug}`,
        name: `${label} — Insights`,
        description: `Governed TextOS insights on ${label.toLowerCase()}.`,
        ...(siteConfig.allowIndexing
          ? { url: `${siteConfig.origin}${canonical}` }
          : {}),
        inLanguage: "en",
        numberOfItems: visible.length,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <main>
        <nav aria-label="Breadcrumb">
          <ol>
            <li>
              <Link href="/">TextOS</Link>
            </li>
            <li>
              <Link href="/insights">Insights</Link>
            </li>
            <li aria-current="page">{label}</li>
          </ol>
        </nav>
        <header>
          <p className="kicker">Topic</p>
          <h1>{label}</h1>
        </header>
        {visible.length === 0 ? (
          <section data-empty-state="topic-hub">
            <h2>Nothing published on this topic yet</h2>
            <p>
              This topic is scaffolded from the governed corpus but no article
              has been published against it. When articles land they will
              appear here.
            </p>
          </section>
        ) : (
          <ul>
            {visible.map((d) => {
              const isDraft = d.truth.publicationStatus !== "published";
              return (
                <li key={d.identity.documentId}>
                  <Link href={`/insights/${d.identity.slug}`}>{d.identity.title}</Link>
                  <p className="data-label">{d.identity.description}</p>
                  {isDraft ? (
                    <span data-role="topic-hub-draft-badge">draft · not public</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
