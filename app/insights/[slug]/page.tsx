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
import { buildCtaAttributionHref } from "@/lib/content-surface-engine/conversion/build-cta-attribution";
import { ManagedTextosSurface } from "@/lib/content-surface-engine/renderer/managed-textos-surface";
import {
  findInsightEntry,
  listInsightEntries,
  resolveReferenceAuthor,
  resolveReferenceEntity,
  resolveRelatedContent,
} from "@/lib/content-surface-engine/site-integration";
import { textosArticleReferencePolicy } from "@/lib/content-surface-engine/surface-policy";
import { serializeJsonLd } from "@/lib/schema-org/serialize";
import { siteConfig } from "@/lib/config/site";
import { previewVisibility } from "@/lib/config/preview-visibility";

export const dynamic = "force-static";
export const dynamicParams = false;

/** Sentinel used when zero insights ship on an indexable build. */
const EMPTY_CORPUS_SENTINEL = "__empty_insights__";

function visibleEntries() {
  const all = listInsightEntries();
  // PR21 §§2-3 : draft visibility is governed by preview-visibility, NEVER by
  // `siteConfig.allowIndexing`. A Production deployment with indexing off is
  // still Production ; it must never surface drafts.
  return previewVisibility.showDraftContent
    ? all
    : all.filter((e) => e.document.truth.publicationStatus === "published");
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
            // A2R : governed social card. Asset exists on disk per verify:a2r ; the
            // width/height are the deterministic viewBox of the SVG.
            images: [
              {
                url: siteConfig.allowIndexing
                  ? `${siteConfig.origin}/og/insights/${slug}.svg`
                  : `/og/insights/${slug}.svg`,
                width: 1200,
                height: 630,
                alt: `${entry.document.identity.title} — TextOS Insight`,
              },
            ],
          },
          twitter: {
            card: "summary_large_image",
            title: compiled.metadata.twitter.title,
            description: compiled.metadata.twitter.description,
            images: [
              siteConfig.allowIndexing
                ? `${siteConfig.origin}/og/insights/${slug}.svg`
                : `/og/insights/${slug}.svg`,
            ],
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
  // PR21 §3 : belt-and-braces. `generateStaticParams` already excludes drafts
  // when preview visibility is off ; this guard is the runtime safety net that
  // ensures no draft URL is ever reachable in a public build.
  if (
    !previewVisibility.showDraftContent &&
    entry.document.truth.publicationStatus !== "published"
  ) {
    notFound();
  }

  const resolved = resolveContentSurface(entry.document, textosArticleReferencePolicy);
  const cta = resolveReferenceCta({
    resolved,
    intent: entry.document.conversion.ctaIntentId ?? "",
  });
  const contentRevision = String(entry.document.lifecycle.revisionNumber ?? 0);
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

  // A2R-SURFACE-SEAL-1 §5 — draft honesty. `compileAuthority` currently emits a
  // schema.org Article node regardless of publication status. For A2R-drafts
  // we filter it OUT so no Article / TechArticle / BlogPosting node reaches
  // the DOM ; and we substitute a minimal Organization + WebPage graph so the
  // page still carries an HONEST publisher identity without any publication
  // semantics.
  const ARTICLE_TYPES = new Set(["Article", "TechArticle", "BlogPosting"]);
  const draftJsonLd: Record<string, unknown>[] = isDraft
    ? [
        {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "urn:textos:org",
              name: "TextOS",
              ...(siteConfig.allowIndexing ? { url: siteConfig.origin } : {}),
            },
            {
              "@type": "WebPage",
              "@id": `urn:textos:content:${entry.document.identity.documentId}#webpage`,
              name: entry.document.identity.title,
              description: entry.document.identity.description,
              inLanguage: entry.document.identity.language,
              publisher: { "@id": "urn:textos:org" },
            },
          ],
        },
      ]
    : [];
  const emittedJsonLd = isDraft
    ? draftJsonLd
    : compiled.jsonLd.filter(
        (node) => !ARTICLE_TYPES.has(String((node as { "@type"?: string })["@type"])) || true,
      );

  return (
    <>
      {emittedJsonLd.map((node, i) => (
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
          resolveAuthor={(id) => {
            const e = resolveReferenceEntity(id);
            return e
              ? { name: e.name, role: e.role, profilePath: e.profilePath }
              : null;
          }}
          kicker={entry.kicker}
          contentRevision={contentRevision}
          breadcrumbInsights
          ctaContextualHref={
            cta
              ? buildCtaAttributionHref({
                  destination: cta.destination,
                  contentId: entry.document.identity.documentId,
                  clusterId: (entry.document as { clusterId?: string }).clusterId ?? null,
                  ctaVariant: cta.variantId,
                  ctaVersion: cta.version,
                  position: "contextual",
                  contentRevision,
                })
              : null
          }
          ctaFinalHref={
            cta
              ? buildCtaAttributionHref({
                  destination: cta.destination,
                  contentId: entry.document.identity.documentId,
                  clusterId: (entry.document as { clusterId?: string }).clusterId ?? null,
                  ctaVariant: cta.variantId,
                  ctaVersion: cta.version,
                  position: "final",
                  contentRevision,
                })
              : null
          }
          relatedEntries={resolveRelatedContent({
            target: entry.document,
            publicOnly: !previewVisibility.showDraftContent,
            limit: 6,
          })}
        />
      </main>
    </>
  );
}
