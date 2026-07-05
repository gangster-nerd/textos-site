import type { MetadataRoute } from "next";

export const dynamic = "force-static";

// site-runtime-architecture.spec.md §6 : textos.io est crawlable.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://textos.io/sitemap.xml",
  };
}
