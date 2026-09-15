import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config/site";
import { loadCollection, isIndexable } from "@/lib/content/content-loader";
import { HUB_TOPIC_IDS, TOPICS } from "@/lib/content/topic-registry";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  // Origine provisoire : pas de sitemap. Des <loc> vers localhost / une URL qui 404
  // déclareraient de fausses URLs aux crawlers. robots.txt interdit déjà tout tant que
  // allowIndexing est false. S'auto-rétablit avec une origine réelle.
  if (!siteConfig.allowIndexing) return [];

  const faqDocs = loadCollection("faq").filter(isIndexable);
  const methodologyDocs = loadCollection("methodology").filter(isIndexable);
  const insightsDocs = loadCollection("insights").filter(isIndexable);

  const latestOf = (docs: ReturnType<typeof loadCollection>) =>
    docs.length
      ? docs.reduce(
          (acc, d) => (d.frontmatter.updatedAt > acc ? d.frontmatter.updatedAt : acc),
          docs[0].frontmatter.updatedAt,
        )
      : null;

  const entries: MetadataRoute.Sitemap = [
    { url: `${siteConfig.origin}/`, priority: 1 },
  ];

  // FAQ hub + entries
  const faqLatest = latestOf(faqDocs);
  if (faqDocs.length > 0) {
    entries.push({
      url: `${siteConfig.origin}/faq`,
      ...(faqLatest ? { lastModified: new Date(faqLatest) } : {}),
      priority: 0.7,
    });
    for (const d of faqDocs) {
      entries.push({
        url: `${siteConfig.origin}/faq/${d.slug}`,
        lastModified: new Date(d.frontmatter.updatedAt),
        priority: 0.6,
      });
    }
  }

  // Methodology entries
  for (const d of methodologyDocs) {
    entries.push({
      url: `${siteConfig.origin}/methodology/${d.slug}`,
      lastModified: new Date(d.frontmatter.updatedAt),
      priority: 0.7,
    });
  }

  // Insights hub + entries + topic hubs (only for hubs that carry published articles).
  const insightsLatest = latestOf(insightsDocs);
  if (insightsDocs.length > 0) {
    entries.push({
      url: `${siteConfig.origin}/insights`,
      ...(insightsLatest ? { lastModified: new Date(insightsLatest) } : {}),
      priority: 0.7,
    });
    for (const d of insightsDocs) {
      entries.push({
        url: `${siteConfig.origin}/insights/${d.slug}`,
        lastModified: new Date(d.frontmatter.updatedAt),
        priority: 0.6,
      });
    }
    // Topic hubs — only emit when hub carries ≥1 published article.
    for (const tid of HUB_TOPIC_IDS) {
      const topic = TOPICS[tid];
      if (!topic.hubSlug) continue;
      const populated = insightsDocs.some((d) => {
        const topics = (d.frontmatter as Record<string, unknown>).topicIds as string[] | undefined;
        return topics?.includes(tid);
      });
      if (!populated) continue;
      entries.push({
        url: `${siteConfig.origin}/insights/topic/${topic.hubSlug}`,
        priority: 0.6,
      });
    }
  }

  return entries;
}
