import Link from "next/link";
import type { Metadata } from "next";
import { siteConfig } from "@/lib/config/site";
import { loadCollection } from "@/lib/content/content-loader";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Questions about how TextOS measures",
  description:
    "What TextOS automates, what it does not, and where measurement ends and judgement begins.",
  // Origine provisoire : pas de canonical (valeur inconnue = absente, jamais fausse).
  ...(siteConfig.allowIndexing ? { alternates: { canonical: "/faq" } } : {}),
};

export default function FaqIndex() {
  const docs = loadCollection("faq").filter(
    (d) => d.frontmatter.editorialStatus === "published"
  );

  return (
    <main>
      <h1>Questions about how TextOS measures</h1>
      <ul>
        {docs.map((doc) => (
          <li key={doc.slug}>
            <Link href={`/faq/${doc.slug}`}>{doc.frontmatter.title}</Link>
            <p>{doc.frontmatter.description}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
