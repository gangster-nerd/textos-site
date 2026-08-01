import type { Metadata } from "next";
import { siteConfig } from "@/lib/config/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.origin),
  robots: siteConfig.allowIndexing
    ? { index: true, follow: true }
    : { index: false, follow: false },
  title: {
    default: "TextOS — Authority Intelligence System",
    template: "%s | TextOS",
  },
  description:
    "TextOS measures how AI answer engines cite your brand — reproducibly, with dispersion and completeness. Not a score. A measurement.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "TextOS",
    url: siteConfig.origin,
    title: "TextOS — Authority Intelligence System",
    description:
      "Measure authority presence in AI answer engines — reproducibly and defensibly.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
