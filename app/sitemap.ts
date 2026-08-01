import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config/site";
import { loadCollection, isIndexable } from "@/lib/content/content-loader";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const docs = loadCollection("faq").filter(isIndexable);

  const latest = docs.length
    ? docs.reduce(
        (acc, doc) =>
          doc.frontmatter.updatedAt > acc ? doc.frontmatter.updatedAt : acc,
        docs[0].frontmatter.updatedAt
      )
    : null;

  return [
    { url: `${siteConfig.origin}/`, priority: 1 },
    {
      url: `${siteConfig.origin}/faq`,
      ...(latest ? { lastModified: new Date(latest) } : {}),
      priority: 0.7,
    },
    ...docs.map((doc) => ({
      url: `${siteConfig.origin}/faq/${doc.slug}`,
      lastModified: new Date(doc.frontmatter.updatedAt),
      priority: 0.6,
    })),
  ];
}
