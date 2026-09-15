import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  resolveContentSurface,
} from "@/lib/content-surface-engine/composition/resolve-content-surface";
import {
  textosArticleReferencePolicy,
  textosMinimalReferencePolicy,
} from "@/lib/content-surface-engine/surface-policy";
import { ManagedTextosSurface } from "@/lib/content-surface-engine/renderer/managed-textos-surface";
import { compileAuthority } from "@/lib/content-surface-engine/authority";
import { resolveReferenceCta } from "@/lib/content-surface-engine/conversion";
import {
  findPreviewEntry,
  listPreviewSlugs,
  resolveReferenceAuthor,
} from "@/lib/content-surface-engine/site-integration";
import { serializeJsonLd } from "@/lib/schema-org/serialize";
import { siteConfig } from "@/lib/config/site";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return listPreviewSlugs().map((slug) => ({ slug }));
}

function policyFor(contentType: string) {
  if (contentType === "product_article") return textosArticleReferencePolicy;
  return textosMinimalReferencePolicy;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = findPreviewEntry(slug);
  if (!entry) return {};
  const policy = policyFor(entry.document.identity.contentType);
  const resolved = resolveContentSurface(entry.document, policy);
  const compiled = compileAuthority({
    resolved,
    siteOrigin: siteConfig.allowIndexing ? siteConfig.origin : null,
    siteName: "TextOS",
    resolveAuthor: (id) => {
      const p = resolveReferenceAuthor(id);
      return p ? { name: p.name } : null;
    },
    lifecycle: {
      publishedAt: entry.document.lifecycle.publishedAt,
      updatedAt: entry.document.lifecycle.updatedAt,
      firstPublishedAt: entry.document.lifecycle.firstPublishedAt ?? undefined,
    },
  });
  return {
    title: compiled.metadata.title,
    description: compiled.metadata.description,
    robots: {
      index: compiled.metadata.robots.index,
      follow: compiled.metadata.robots.follow,
    },
    ...(compiled.metadata.canonical
      ? { alternates: { canonical: compiled.metadata.canonical } }
      : {}),
    openGraph: {
      type: "article",
      title: compiled.metadata.openGraph.title,
      description: compiled.metadata.openGraph.description,
      ...(compiled.metadata.openGraph.url ? { url: compiled.metadata.openGraph.url } : {}),
      ...(compiled.metadata.openGraph.siteName
        ? { siteName: compiled.metadata.openGraph.siteName }
        : {}),
    },
    twitter: {
      card: compiled.metadata.twitter.card,
      title: compiled.metadata.twitter.title,
      description: compiled.metadata.twitter.description,
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = findPreviewEntry(slug);
  if (!entry) notFound();

  const policy = policyFor(entry.document.identity.contentType);
  const resolved = resolveContentSurface(entry.document, policy);

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
    lifecycle: {
      publishedAt: entry.document.lifecycle.publishedAt,
      updatedAt: entry.document.lifecycle.updatedAt,
      firstPublishedAt: entry.document.lifecycle.firstPublishedAt ?? undefined,
    },
  });

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
