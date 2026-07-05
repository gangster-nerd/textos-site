import type { MetadataRoute } from "next";

export const dynamic = "force-static";

// page-map.spec.md §2 : le sitemap ne référence que les pages index = true.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: "https://textos.io/", changeFrequency: "weekly", priority: 1 }];
}
