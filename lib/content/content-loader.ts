import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { CtaResolution } from "@/lib/conversion/cta-resolver";
import { ContentFrontmatterSchema, type ContentFrontmatter } from "./content-schema";
import { runGates } from "./content-gates";

const ROOT = path.join(process.cwd(), "content");

const PLACEHOLDERS = ["<!-- à rédiger", "<!-- Section obligatoire", "[TODO]", "TBD"];

export type ResolvedDocument = {
  slug: string;
  collection: string;
  /**
   * Identité STABLE du contenu, `${collection}:${slug}`. DÉRIVÉE, jamais déclarée en frontmatter :
   * un identifiant saisi à la main peut être dupliqué, contredire le chemin, ou survivre à un
   * renommage. Le même id est utilisé par le composant CTA, le manifeste d'attribution, les
   * événements futurs et les tests — sinon l'attribution ne se raccorde à rien.
   *
   * Distinct de la route (`/faq/<slug>`) : l'un identifie, l'autre localise.
   */
  contentId: string;
  /** Route publique du document. Relative — l'origine est provisoire (aucune URL absolue). */
  path: string;
  frontmatter: ContentFrontmatter;
  body: string;
  maturityLabels: string[];
  /**
   * Résolution CTA faisant AUTORITÉ, décidée une fois par `runGates`. C'est ce que la page passe à
   * `ContentCta` — le composant ne résout rien, il rend une décision déjà prise.
   */
  ctaResolution: CtaResolution;
};

/** Identité stable d'un contenu. Une seule définition, partagée par tous les consommateurs. */
export function deriveContentId(collection: string, slug: string): string {
  return `${collection}:${slug}`;
}

/** Route publique d'un contenu. Relative, jamais absolue. */
export function deriveContentPath(collection: string, slug: string): string {
  return `/${collection}/${slug}`;
}

export function listSlugs(collection: string): string[] {
  return fs
    .readdirSync(path.join(ROOT, collection))
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

export function loadDocument(collection: string, slug: string): ResolvedDocument {
  const file = path.resolve(path.join(ROOT, collection, `${slug}.md`));
  if (!file.startsWith(path.resolve(ROOT))) {
    throw new Error(`Chemin hors de content/ : ${slug}`);
  }

  const { data, content } = matter(fs.readFileSync(file, "utf8"));

  const parsed = ContentFrontmatterSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      `Frontmatter invalide — ${collection}/${slug}.md\n` +
        JSON.stringify(parsed.error.format(), null, 2)
    );
  }

  if (
    parsed.data.editorialStatus === "published" &&
    PLACEHOLDERS.some((token) => content.includes(token))
  ) {
    throw new Error(
      `Contenu publié incomplet — placeholder détecté dans ${collection}/${slug}.md`
    );
  }

  const { maturityLabels, ctaResolution } = runGates(parsed.data, slug);

  return {
    slug,
    collection,
    contentId: deriveContentId(collection, slug),
    path: deriveContentPath(collection, slug),
    frontmatter: parsed.data,
    body: content,
    maturityLabels,
    ctaResolution,
  };
}

export function loadCollection(collection: string): ResolvedDocument[] {
  return listSlugs(collection)
    .map((slug) => loadDocument(collection, slug))
    .sort((a, b) =>
      b.frontmatter.publishedAt.localeCompare(a.frontmatter.publishedAt)
    );
}

/** Un brouillon ne doit pas exister dans l'export, pas seulement être absent du sitemap. */
export function listPublishedSlugs(collection: string): string[] {
  return loadCollection(collection)
    .filter((doc) => doc.frontmatter.editorialStatus === "published")
    .map((doc) => doc.slug);
}

export function isIndexable(doc: ResolvedDocument): boolean {
  return (
    doc.frontmatter.editorialStatus === "published" &&
    doc.frontmatter.indexingPolicy === "index"
  );
}
