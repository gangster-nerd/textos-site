import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://textos.io"),
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
    url: "https://textos.io",
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
