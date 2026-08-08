import type { Metadata } from "next";
import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { siteConfig } from "@/lib/config/site";
import { listPublishedSlugs, loadCollection, loadDocument } from "@/lib/content/content-loader";
import { buildArticleJsonLd } from "@/lib/schema-org/build-article";
import { serializeJsonLd } from "@/lib/schema-org/serialize";
import { ContentVisual } from "@/components/content/ContentVisual";
import { ContentCta } from "@/components/content/ContentCta";

const COLLECTION = "methodology";

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

  const siblings = loadCollection(COLLECTION)
    .filter((page) => page.frontmatter.editorialStatus === "published")
    .map((page) => ({
      href: page.path,
      title: page.frontmatter.title,
      current: page.path === doc.path,
    }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <main>
        <article className="doc">
          <header className="doc__head">
            <p className="kicker">Methodology</p>
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

        {/* Navigation LATÉRALE du cluster : les quatre pages se lisent ensemble, et n'en offrir
            que le retour à l'accueil obligeait à repasser par la homepage entre deux doctrines.
            Titres lus depuis les documents — aucune liste en dur à maintenir en parallèle. */}
        <nav className="doc__siblings" aria-label="Methodology">
          <p className="data-label">Methodology</p>
          <ul>
            {siblings.map((page) => (
              <li key={page.href}>
                {page.current ? (
                  <span aria-current="page">{page.title}</span>
                ) : (
                  <Link href={page.href}>{page.title}</Link>
                )}
              </li>
            ))}
          </ul>
          <p>
            <Link href="/">how TextOS measures authority presence</Link>
          </p>
        </nav>
      </main>
    </>
  );
}
