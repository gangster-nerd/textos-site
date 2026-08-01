import type { Metadata } from "next";
import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { siteConfig } from "@/lib/config/site";
import { listPublishedSlugs, loadDocument } from "@/lib/content/content-loader";
import { buildArticleJsonLd } from "@/lib/schema-org/build-article";
import { serializeJsonLd } from "@/lib/schema-org/serialize";

const COLLECTION = "faq";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  // listPublishedSlugs, jamais listSlugs : un brouillon ne doit produire
  // aucun HTML, même inaccessible depuis l'index.
  return listPublishedSlugs(COLLECTION).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = loadDocument(COLLECTION, slug);
  return {
    title: doc.frontmatter.title,
    description: doc.frontmatter.description,
    // Origine provisoire : pas de canonical (valeur inconnue = absente, jamais fausse).
    ...(siteConfig.allowIndexing
      ? { alternates: { canonical: `/${COLLECTION}/${slug}` } }
      : {}),
    robots:
      doc.frontmatter.indexingPolicy === "noindex"
        ? { index: false, follow: true }
        : undefined,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = loadDocument(COLLECTION, slug);
  const jsonLd = buildArticleJsonLd(doc, COLLECTION);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <main>
        <article>
          <h1>{doc.frontmatter.title}</h1>

          {doc.maturityLabels.map((label) => (
            <p key={label} role="note">
              <strong>Status:</strong> {label}
            </p>
          ))}

          <section>
            <h2>Short answer</h2>
            <p>{doc.frontmatter.shortAnswer.body}</p>
          </section>

          <Markdown remarkPlugins={[remarkGfm]}>{doc.body}</Markdown>
        </article>

        {/* Parcours 2 du maillage : FAQ → doctrine de mesure (homepage).
            Ancre vers la racine seulement — aucun fragment #… relevé, on ne crée
            pas d'ancre morte ; le libellé décrit l'entité de destination. */}
        <nav aria-label="Related">
          <Link href="/">how TextOS measures authority presence</Link>
        </nav>
      </main>
    </>
  );
}
