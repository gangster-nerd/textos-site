import type { Metadata } from "next";
import { siteConfig } from "@/lib/config/site";
import { SiteHeader } from "@/components/site/SiteHeader";
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
  // Origine provisoire : pas de canonical. Une valeur inconnue se déclare absente,
  // jamais par une valeur fausse (localhost / URL qui 404).
  ...(siteConfig.allowIndexing ? { alternates: { canonical: "/" } } : {}),
  openGraph: {
    type: "website",
    siteName: "TextOS",
    // Origine provisoire : pas d'og:url absolu (valeur inconnue = absente, jamais fausse).
    ...(siteConfig.allowIndexing ? { url: siteConfig.origin } : {}),
    title: "TextOS — Authority Intelligence System",
    description:
      "Measure authority presence in AI answer engines — reproducibly and defensibly.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Lien d'évitement : premier élément focusable, il permet d'atteindre le contenu sans
            traverser la navigation au clavier. Visible seulement au focus. */}
        <a href="#content" className="skip-link">
          Skip to content
        </a>
        <SiteHeader />
        <div id="content">{children}</div>
      </body>
    </html>
  );
}
