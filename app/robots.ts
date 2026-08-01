import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  if (!siteConfig.allowIndexing) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteConfig.origin}/sitemap.xml`,
  };
}
