import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { ContentFrontmatterSchema, type ContentFrontmatter } from "./content-schema";
import { runGates } from "./content-gates";

const ROOT = path.join(process.cwd(), "content");

const PLACEHOLDERS = ["<!-- à rédiger", "<!-- Section obligatoire", "[TODO]", "TBD"];

export type ResolvedDocument = {
  slug: string;
  frontmatter: ContentFrontmatter;
  body: string;
  maturityLabels: string[];
};

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

  const { maturityLabels } = runGates(parsed.data, slug);

  return { slug, frontmatter: parsed.data, body: content, maturityLabels };
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
