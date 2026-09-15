// A3 — migrate the 12 TextOS insight documents to ContentDocument v1.
//
// One-shot migration. The output JSON files are the authoritative form; the source markdown
// is never re-parsed at runtime. gray-matter is used ONCE here (already a dependency for the
// legacy FAQ pipeline) to read the frontmatter of each source file. Body reconstruction is
// deterministic: shortAnswer → answer block, every `## Heading` becomes a heading block
// followed by the first non-empty paragraph as a paragraph block. This is a lossy migration
// by design (mission: "preserve substantive copy", not full markdown fidelity) — the goal is
// to validate the CSE pipeline against real editorial structure.
//
// Provenance: the source frontmatter declares productSnapshotSha = d1b8b505… which is NOT
// present in content/certified-lineage.json. Migrated documents therefore leave sourceSha
// undefined (composition would fail-closed on an uncertified SHA) and carry
// sourceEvidenceDigest = sha256 of the source markdown file. sourceAuthority remains
// UNCERTIFIED, which the downstream PUBLICATION_PASS treats as a noindex condition.

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const SOURCE_ROOT = "/Users/marc/dev/textos-site-worktrees/commit-to-content-v1/content/insights";
const OUT_DIR = path.resolve(__dirname, "../content/managed-corpus");

interface RawFrontmatter {
  title: string;
  description: string;
  contentType: string;
  language: string;
  editorialStatus: string;
  indexingPolicy: string;
  publishedAt: string;
  updatedAt: string;
  authorId?: string;
  reviewerIds?: string[];
  firstPublishedAt?: string | null;
  lastReviewedAt?: string;
  revisionNumber?: number;
  schemaType?: string;
  primaryTopicId?: string;
  topicIds?: string[];
  audience?: string;
  funnelStage?: string;
  productSnapshotSha?: string;
  evidenceRefs?: string[];
  capabilityIds?: string[];
  claimIds?: string[];
  clusterId?: string;
  ctaVariant?: string;
  targetQuery?: string;
  searchIntent?: string;
  shortAnswer: { body: string; claimIds: string[] };
  editorialClass?: string;
  truthMode?: string;
  sourcePaths?: string[];
  sourceSemantics?: string;
  disclaimer?: string;
}

interface Block {
  id: string;
  kind: string;
  level?: number;
  data: Record<string, unknown>;
  slot?: string;
}

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractBlocks(body: string, shortAnswer: string): Block[] {
  const blocks: Block[] = [];
  blocks.push({ id: "answer", kind: "answer", data: { text: shortAnswer } });

  const lines = body.split("\n");
  let currentH2: { title: string; id: string; paragraphs: string[] } | null = null;
  let inCode = false;
  const seen = new Set<string>();
  const sections: Array<{ title: string; id: string; paragraphs: string[] }> = [];

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("```")) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    const h2 = /^##\s+(.+)$/.exec(line);
    if (h2) {
      if (currentH2) sections.push(currentH2);
      let id = slugify(h2[1]);
      let n = 1;
      while (seen.has(id)) {
        n += 1;
        id = `${slugify(h2[1])}-${n}`;
      }
      seen.add(id);
      currentH2 = { title: h2[1].trim(), id, paragraphs: [] };
      continue;
    }
    if (line.startsWith("#")) continue; // ignore other heading levels
    if (currentH2 && line.trim().length > 0) {
      // Only capture paragraph-shaped lines (not list bullets or blockquotes).
      if (/^[-*>|]/.test(line.trim())) continue;
      currentH2.paragraphs.push(line.trim());
    }
  }
  if (currentH2) sections.push(currentH2);

  for (const section of sections) {
    blocks.push({
      id: `h-${section.id}`,
      kind: "heading",
      level: 2,
      data: { text: section.title },
    });
    const first = section.paragraphs[0];
    if (first) {
      blocks.push({
        id: `p-${section.id}`,
        kind: "paragraph",
        data: { text: first },
      });
    }
  }

  return blocks;
}

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function toContentDocument(sourceFile: string, raw: RawFrontmatter, body: string) {
  const slug = path.basename(sourceFile, ".md");
  const rawBytes = readFileSync(sourceFile);
  const sourceDigest = sha256(rawBytes);
  const blocks = extractBlocks(body, raw.shortAnswer.body);
  return {
    contentSchemaVersion: "content-document@1",
    identity: {
      documentId: `textos-insight:${slug}`,
      contentType: "product_article",
      slug,
      language: raw.language,
      title: raw.title,
      description: raw.description,
    },
    editorial: {
      authorIds: raw.authorId ? [raw.authorId] : [],
      reviewerIds: raw.reviewerIds ?? [],
      primaryTopicId: raw.primaryTopicId,
      topicIds: raw.topicIds ?? [],
      audience: raw.audience,
      funnelStage: raw.funnelStage,
    },
    truth: {
      // Product-specific vocabulary is CARRIED opaquely — the composition boundary is
      // publicationStatus + allowedSurfaces only. See A1 contract.
      statusVocabulary: "textos.insights.ctc-article-system-1",
      statusVocabularyVersion: "v1",
      sourceStatus: [
        raw.editorialClass ?? "UNKNOWN",
        raw.truthMode ?? "UNKNOWN",
        raw.editorialStatus,
      ].join(":"),
      publicationStatus: raw.editorialStatus === "published" ? "published" : "draft",
      allowedSurfaces: ["reference"],
      claimIds: raw.claimIds ?? [],
      evidenceRefs: raw.evidenceRefs ?? [],
      capabilityIds: raw.capabilityIds ?? [],
    },
    provenance: {
      sourceRepository: "gangster-nerd/textos-v0",
      // productSnapshotSha=d1b8b505… is uncertified in content/certified-lineage.json;
      // omit sourceSha and carry sha256 of the source markdown instead.
      sourceEvidenceDigest: sourceDigest,
      sourceAuthority: "UNCERTIFIED",
    },
    body: blocks,
    relationships: { relatedContentIds: [] },
    conversion: {
      ctaIntentId: raw.ctaVariant === "measurement_request" ? "MEASURE_BRAND" : undefined,
      conversionAllowed: raw.ctaVariant === "measurement_request",
    },
    lifecycle: {
      firstPublishedAt: raw.firstPublishedAt ?? null,
      publishedAt: raw.publishedAt,
      updatedAt: raw.updatedAt,
      lastReviewedAt: raw.lastReviewedAt,
      revisionNumber: raw.revisionNumber,
    },
    seo: {
      indexingIntent: raw.indexingPolicy === "index" ? "index" : "noindex",
      canonicalPath: `/insights/${slug}`,
      schemaType: raw.schemaType,
      targetQuery: raw.targetQuery,
      searchIntent: raw.searchIntent,
    },
  };
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const files = readdirSync(SOURCE_ROOT)
    .filter((f) => f.endsWith(".md"))
    .sort();
  const inventory: Array<{ slug: string; path: string; sha256: string }> = [];
  for (const filename of files) {
    const full = path.join(SOURCE_ROOT, filename);
    const parsed = matter(readFileSync(full, "utf8"));
    const doc = toContentDocument(full, parsed.data as RawFrontmatter, parsed.content);
    const out = path.join(OUT_DIR, `${doc.identity.slug}.json`);
    writeFileSync(out, JSON.stringify(doc, null, 2) + "\n", "utf8");
    const sha = sha256(readFileSync(full));
    inventory.push({ slug: doc.identity.slug, path: `content/insights/${filename}`, sha256: sha });
    process.stdout.write(`migrated ${doc.identity.slug} (${doc.body.length} blocks)\n`);
  }
  writeFileSync(
    path.join(OUT_DIR, "INVENTORY.json"),
    JSON.stringify(
      { migratedAt: "2026-09-13", sourceBranch: "feat/ctc-article-system-1", entries: inventory },
      null,
      2,
    ) + "\n",
    "utf8",
  );
}

main();
