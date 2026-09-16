// CTC-CSE-CONVERGENCE-1 — /insights/[slug] route wired to Content Surface Engine.
//
// The route is a THIN adapter :
//   1. `generateStaticParams` reads the managed corpus (12 ContentDocuments).
//   2. In Production (`allowIndexing=true`) only PUBLISHED documents are exported.
//   3. In Preview (`allowIndexing=false`) drafts are exported too, with a visible
//      DRAFT · NOT PUBLIC banner. `robots: { index: false, follow: false }` on drafts —
//      noindex alone would leak follow-signals from an accidentally reachable draft.
//   4. Rendering delegates to `ManagedTextosSurface` / `RenderReferenceBody`. No
//      Markdown parsing here, no schema-org rebuilding here, no CTA composition here.
//      Every visual decision lives inside CSE (`textosArticleReferencePolicy`).

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { compileAuthority } from "@/lib/content-surface-engine/authority";
import { resolveContentSurface } from "@/lib/content-surface-engine/composition/resolve-content-surface";
import { resolveReferenceCta } from "@/lib/content-surface-engine/conversion";
import { ManagedTextosSurface } from "@/lib/content-surface-engine/renderer/managed-textos-surface";
import {
  findInsightEntry,
  listInsightEntries,
  resolveReferenceAuthor,
} from "@/lib/content-surface-engine/site-integration";
import { textosArticleReferencePolicy } from "@/lib/content-surface-engine/surface-policy";
import { serializeJsonLd } from "@/lib/schema-org/serialize";
import { siteConfig } from "@/lib/config/site";

export const dynamic = "force-static";
export const dynamicParams = false;

/** Sentinel used when zero insights ship on an indexable build. */
const EMPTY_CORPUS_SENTINEL = "__empty_insights__";

function visibleEntries() {
  const all = listInsightEntries();
  return siteConfig.allowIndexing
    ? all.filter((e) => e.document.truth.publicationStatus === "published")
    : all;
}

export function generateStaticParams() {
  const entries = visibleEntries();
  if (entries.length === 0) return [{ slug: EMPTY_CORPUS_SENTINEL }];
  return entries.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (slug === EMPTY_CORPUS_SENTINEL) {
    return { title: "Not found", robots: { index: false, follow: false } };
  }
  const entry = findInsightEntry(slug);
  if (!entry) return { title: "Not found", robots: { index: false, follow: false } };

  const resolved = resolveContentSurface(entry.document, textosArticleReferencePolicy);
  const compiled = compileAuthority({
    resolved,
    siteOrigin: siteConfig.allowIndexing ? siteConfig.origin : null,
    siteName: "TextOS",
    resolveAuthor: (id) => {
      const p = resolveReferenceAuthor(id);
      return p ? { name: p.name } : null;
    },
    // CTO §3 — drafts emit no datePublished / dateModified. `compileAuthority`
    // treats supplied lifecycle dates as "emit these" ; we simply don't supply them
    // for drafts. The document's `publishedAt` field is a legacy migration
    // carry-over (mirrors CTC-9's frontmatter publishedAt) and does NOT constitute
    // an editorial publication commitment on its own.
    lifecycle:
      entry.document.truth.publicationStatus === "published"
        ? {
            publishedAt: entry.document.lifecycle.firstPublishedAt ?? undefined,
            updatedAt:
              entry.document.lifecycle.lastReviewedAt ??
              entry.document.lifecycle.firstPublishedAt ??
              undefined,
            firstPublishedAt: entry.document.lifecycle.firstPublishedAt ?? undefined,
          }
        : {},
  });

  const isPublished = entry.document.truth.publicationStatus === "published";

  return {
    title: compiled.metadata.title,
    description: compiled.metadata.description,
    // A draft is not public. `follow: false` on a draft prevents accidental link-signal
    // propagation from a reviewer-accessible URL.
    robots: isPublished
      ? {
          index: compiled.metadata.robots.index,
          follow: compiled.metadata.robots.follow,
        }
      : { index: false, follow: false },
    ...(isPublished && compiled.metadata.canonical
      ? { alternates: { canonical: compiled.metadata.canonical } }
      : {}),
    ...(isPublished
      ? {
          openGraph: {
            type: "article",
            title: compiled.metadata.openGraph.title,
            description: compiled.metadata.openGraph.description,
            ...(compiled.metadata.openGraph.url
              ? { url: compiled.metadata.openGraph.url }
              : {}),
            ...(compiled.metadata.openGraph.siteName
              ? { siteName: compiled.metadata.openGraph.siteName }
              : {}),
          },
          twitter: {
            card: compiled.metadata.twitter.card,
            title: compiled.metadata.twitter.title,
            description: compiled.metadata.twitter.description,
          },
        }
      : {}),
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === EMPTY_CORPUS_SENTINEL) notFound();
  const entry = findInsightEntry(slug);
  if (!entry) notFound();
  // Belt-and-braces : if Production somehow reaches a draft (upstream mis-config), 404.
  if (
    siteConfig.allowIndexing &&
    entry.document.truth.publicationStatus !== "published"
  ) {
    notFound();
  }

  const resolved = resolveContentSurface(entry.document, textosArticleReferencePolicy);
  const cta = resolveReferenceCta({
    resolved,
    intent: entry.document.conversion.ctaIntentId ?? "",
  });
  const compiled = compileAuthority({
    resolved,
    siteOrigin: siteConfig.allowIndexing ? siteConfig.origin : null,
    siteName: "TextOS",
    resolveAuthor: (id) => {
      const p = resolveReferenceAuthor(id);
      return p ? { name: p.name } : null;
    },
    // CTO §3 — drafts emit no datePublished / dateModified. `compileAuthority`
    // treats supplied lifecycle dates as "emit these" ; we simply don't supply them
    // for drafts. The document's `publishedAt` field is a legacy migration
    // carry-over (mirrors CTC-9's frontmatter publishedAt) and does NOT constitute
    // an editorial publication commitment on its own.
    lifecycle:
      entry.document.truth.publicationStatus === "published"
        ? {
            publishedAt: entry.document.lifecycle.firstPublishedAt ?? undefined,
            updatedAt:
              entry.document.lifecycle.lastReviewedAt ??
              entry.document.lifecycle.firstPublishedAt ??
              undefined,
            firstPublishedAt: entry.document.lifecycle.firstPublishedAt ?? undefined,
          }
        : {},
  });

  const isDraft = entry.document.truth.publicationStatus !== "published";

  return (
    <>
      {compiled.jsonLd.map((node, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(node) }}
        />
      ))}
      <main>
        {isDraft && (
          <aside
            className="cse-surface__draft-banner"
            role="note"
            aria-label="Draft banner"
            data-role="draft-banner"
          >
            <strong>DRAFT · NOT PUBLIC</strong>
            <span>
              {" "}
              This article has not been published. It is served to reviewers only,
              carries robots noindex/nofollow, and is excluded from listings and
              related content in Production.
            </span>
          </aside>
        )}
        <ManagedTextosSurface
          resolved={resolved}
          cta={cta}
          resolveAuthor={(id) => resolveReferenceAuthor(id)}
          kicker={entry.kicker}
          contentRevision={String(entry.document.lifecycle.revisionNumber ?? 0)}
        />
      </main>
    </>
  );
}
