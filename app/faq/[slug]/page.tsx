import type { Metadata } from "next";
import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { siteConfig } from "@/lib/config/site";
import { listPublishedSlugs, loadDocument } from "@/lib/content/content-loader";
import { buildArticleJsonLd } from "@/lib/schema-org/build-article";
import { serializeJsonLd } from "@/lib/schema-org/serialize";
import { ContentVisual } from "@/components/content/ContentVisual";
import { ContentCta } from "@/components/content/ContentCta";

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
        <article className="doc">
          <header className="doc__head">
            <p className="kicker">FAQ</p>
            <h1>{doc.frontmatter.title}</h1>
            {doc.maturityLabels.map((label) => (
              /* Étiquette de maturité : elle relativise TOUT ce qui suit, donc elle se lit avant
                 le contenu, pas en note de bas de page. */
              <p key={label} className="doc__status" role="note">
                <span className="data-label">Status</span> {label}
              </p>
            ))}
          </header>

          <section className="doc__short" aria-labelledby="short-answer">
            <h2 id="short-answer" className="data-label">
              Short answer
            </h2>
            <p className="lede">{doc.frontmatter.shortAnswer.body}</p>
          </section>

          {doc.frontmatter.visualIds?.map((visualId) => (
            <ContentVisual key={visualId} visualId={visualId} />
          ))}

          <Markdown remarkPlugins={[remarkGfm]}>{doc.body}</Markdown>
        </article>

        {/* Primitive de conversion. On passe la variante RÉSOLUE par le gate, pas celle
            déclarée en frontmatter : la page rend une décision, elle ne la prend pas.
            En S1 toutes les variantes sont disabled → resolvedVariant vaut null. */}
        <ContentCta
          variant={doc.ctaResolution.resolvedVariant}
          contentId={doc.contentId}
          position="end"
        />

        {/* Parcours 2 du maillage : FAQ → doctrine de mesure (homepage).
            Ancre vers la racine seulement — aucun fragment #… relevé, on ne crée
            pas d'ancre morte ; le libellé décrit l'entité de destination. */}
        <nav className="doc__siblings" aria-label="Related">
          <p className="data-label">Related</p>
          <ul>
            <li>
              <Link href="/">how TextOS measures authority presence</Link>
            </li>
            <li>
              <Link href="/methodology/authority-presence">How Authority Presence is measured</Link>
            </li>
          </ul>
        </nav>
      </main>
    </>
  );
}
