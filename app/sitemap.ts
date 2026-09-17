import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config/site";
import { loadCollection, isIndexable } from "@/lib/content/content-loader";
import {
  listInsightEntries,
  listGovernedTopics,
} from "@/lib/content-surface-engine/site-integration";

export const dynamic = "force-static";

/**
 * A3R §8 — insights sitemap eligibility.
 *
 * The insights corpus is emitted into the public sitemap ONLY when the
 * ContentDocument is publication-eligible per the four-gate INDEXABLE
 * conjunction : CONTENT_PASS && FIDELITY_PASS && SURFACE_PASS && PUBLICATION_PASS.
 *
 * `siteConfig.allowIndexing == false` remains the OUTER fail-closed guard : an
 * un-indexable build produces an EMPTY sitemap regardless of corpus state.
 *
 * With today's 12-draft corpus the four-gate conjunction is FALSE for every
 * article, so 0 insight URLs are emitted. When an article becomes publish-
 * certifiable it will begin to appear here without any code change here.
 */
function insightIsPubliclyEligible(
  entry: ReturnType<typeof listInsightEntries>[number],
): boolean {
  return (
    entry.document.truth.publicationStatus === "published" &&
    entry.document.seo.indexingIntent === "index"
  );
}

export default function sitemap(): MetadataRoute.Sitemap {
  if (!siteConfig.allowIndexing) return [];

  const faqDocs = loadCollection("faq").filter(isIndexable);
  const insightEntries = listInsightEntries().filter(insightIsPubliclyEligible);

  const faqLatest = faqDocs.length
    ? faqDocs.reduce(
        (acc, doc) =>
          doc.frontmatter.updatedAt > acc ? doc.frontmatter.updatedAt : acc,
        faqDocs[0].frontmatter.updatedAt,
      )
    : null;

  const entries: MetadataRoute.Sitemap = [
    { url: `${siteConfig.origin}/`, priority: 1 },
  ];

  if (faqDocs.length > 0) {
    entries.push({
      url: `${siteConfig.origin}/faq`,
      ...(faqLatest ? { lastModified: new Date(faqLatest) } : {}),
      priority: 0.7,
    });
    for (const doc of faqDocs) {
      entries.push({
        url: `${siteConfig.origin}/faq/${doc.slug}`,
        lastModified: new Date(doc.frontmatter.updatedAt),
        priority: 0.6,
      });
    }
  }

  if (insightEntries.length > 0) {
    entries.push({
      url: `${siteConfig.origin}/insights`,
      priority: 0.7,
    });
    for (const e of insightEntries) {
      entries.push({
        url: `${siteConfig.origin}/insights/${e.document.identity.slug}`,
        ...(e.document.lifecycle.updatedAt
          ? { lastModified: new Date(e.document.lifecycle.updatedAt) }
          : {}),
        priority: 0.6,
      });
    }
    const publiclyEligibleIds = new Set(
      insightEntries.map((e) => e.document.identity.documentId),
    );
    for (const topic of listGovernedTopics()) {
      const eligibleInTopic = topic.documentIds.filter((id) =>
        publiclyEligibleIds.has(id),
      );
      if (eligibleInTopic.length > 0) {
        entries.push({
          url: `${siteConfig.origin}/insights/topic/${topic.slug}`,
          priority: 0.5,
        });
      }
    }
  }

  return entries;
}
