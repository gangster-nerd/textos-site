import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config/site";

export const dynamic = "force-static";

// page-map.spec.md §2 : le sitemap ne référence que les pages index = true.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${siteConfig.origin}/`, changeFrequency: "weekly", priority: 1 }];
}
