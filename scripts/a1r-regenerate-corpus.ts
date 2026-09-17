#!/usr/bin/env tsx
// A1R Phase 5 — regenerate `content/managed-corpus/*.json` FROM authoritative
// Markdown under `content/insights/*.md`.
//
// The A3 corpus body is non-authoritative after A1 certification withdrawal.
// This script parses each .md, compiles the mdast body via the Phase 2 Markdown
// compiler, applies the EditorialIdentityPolicy mapping (authorId is normalized
// to a Person via the frontmatter), and writes the resulting ContentDocument JSON
// deterministically to disk.
//
// Every article that carries a `<!-- cta:contextual -->` marker will contain a
// cta_slot block in place. `related_content_slot` is appended for surface-policy
// binding — it is a NON-AUTHORITATIVE synthetic block (no `mdast` payload) so
// the fidelity oracle correctly ignores it.

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { createHash } from "node:crypto";

import type { ContentDocument } from "@/lib/content-surface-engine/contract/content-document";
import { ContentDocumentSchema } from "@/lib/content-surface-engine/contract/content-document";
import { parseMarkdown } from "@/lib/content-surface-engine/producers/markdown/parse-markdown";
import { mdastToContentBody } from "@/lib/content-surface-engine/producers/markdown/mdast-to-content-document";

const INSIGHTS_DIR = "content/insights";
const CORPUS_DIR = "content/managed-corpus";
const INVENTORY_PATH = path.join(CORPUS_DIR, "INVENTORY.json");

interface InventoryEntry {
  slug: string;
  path: string;
  sha256: string;
}

interface Inventory {
  migratedAt: string;
  sourceBranch: string;
  entries: InventoryEntry[];
}

/** Deterministic JSON — sorted keys, two-space indent, single trailing LF. */
function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      out[k] = sortKeys((v as Record<string, unknown>)[k]);
    }
    return out;
  }
  return v;
}

function stableStringify(v: unknown): string {
  return JSON.stringify(sortKeys(v), null, 2) + "\n";
}

interface FrontmatterInputs {
  title: string;
  description: string;
  language: string;
  editorialStatus: string;
  indexingPolicy: "index" | "noindex";
  publishedAt: string;
  updatedAt: string;
  firstPublishedAt: string | null;
  authorId: string;
  reviewerIds: readonly string[];
  primaryTopicId?: string;
  topicIds?: readonly string[];
  audience?: string;
  funnelStage?: string;
  claimIds: readonly string[];
  evidenceRefs?: readonly string[];
  capabilityIds?: readonly string[];
  targetQuery: string;
  searchIntent: string;
  shortAnswer?: { body: string; claimIds?: string[] };
  ctaVariant?: string;
  clusterId?: string;
  productSnapshotSha?: string;
  editorialClass?: string;
  truthMode?: string;
  schemaType?: string;
  revisionNumber?: number;
  revisionSummary?: string;
  lastReviewedAt?: string | null;
  contentType?: string;
}

/** Build the ContentDocument from frontmatter + parsed body blocks. */
function toContentDocument(
  slug: string,
  fm: FrontmatterInputs,
  bodyBlocks: readonly ContentDocument["body"][number][],
  sourceDigest: string,
): ContentDocument {
  const documentId = `textos-insight:${slug}`;
  const status = fm.editorialStatus === "published" ? "published" : "draft";
  const editorialClass = fm.editorialClass ?? "PRODUCT_PRINCIPLE";
  const truthMode = fm.truthMode ?? "DOCUMENTARY";
  const sourceStatus = `${editorialClass}:${truthMode}:${fm.editorialStatus}`;

  // The frontmatter's `shortAnswer.body` is producer-declared authoritative content
  // (governed YAML, not markdown body). We surface it as an `answer` block so the
  // textos.article@1 CONTENT_PASS profile is satisfied. This block carries NO mdast
  // payload — it is not part of the Markdown fidelity oracle by design.
  const answerBlock = fm.shortAnswer?.body?.trim()
    ? [{ id: "answer", kind: "answer" as const, data: { text: fm.shortAnswer.body.trim() } }]
    : [];

  // `related_content_slot` is a similarly non-authoritative block. Non-authoritative
  // (no mdast) blocks are ignored by the fidelity oracle by construction.
  const body: ContentDocument["body"] = [
    ...answerBlock,
    ...bodyBlocks,
    { id: "related", kind: "related_content_slot", slot: "related", data: {} },
  ];

  const doc: ContentDocument = {
    contentSchemaVersion: "content-document@1",
    identity: {
      documentId,
      contentType: fm.contentType ?? "product_article",
      slug,
      language: fm.language,
      title: fm.title,
      description: fm.description,
    },
    editorial: {
      authorIds: [fm.authorId],
      reviewerIds: [...(fm.reviewerIds ?? [])],
      primaryTopicId: fm.primaryTopicId,
      topicIds: [...(fm.topicIds ?? [])],
      audience: fm.audience,
      funnelStage: fm.funnelStage,
    },
    truth: {
      statusVocabulary: "textos.insights.ctc-article-system-1",
      statusVocabularyVersion: "v1",
      sourceStatus,
      publicationStatus: status,
      allowedSurfaces: ["reference"],
      claimIds: [...(fm.claimIds ?? [])],
      evidenceRefs: [...(fm.evidenceRefs ?? [])],
      capabilityIds: [...(fm.capabilityIds ?? [])],
    },
    provenance: {
      sourceRepository: "gangster-nerd/textos-site",
      sourceEvidenceDigest: sourceDigest,
      sourceAuthority: "UNCERTIFIED",
    },
    body,
    relationships: { relatedContentIds: [] },
    conversion: {
      ctaIntentId:
        fm.ctaVariant && fm.ctaVariant !== "none" ? "MEASURE_BRAND" : undefined,
      conversionAllowed: fm.ctaVariant !== undefined && fm.ctaVariant !== "none",
    },
    lifecycle: {
      firstPublishedAt: fm.firstPublishedAt ?? null,
      publishedAt: fm.publishedAt,
      updatedAt: fm.updatedAt,
      revisionNumber: fm.revisionNumber ?? 0,
      // A1R §10: lastReviewedAt remains null on drafts. If the frontmatter carries
      // a date it is preserved but only when non-null.
      ...(fm.lastReviewedAt ? { lastReviewedAt: fm.lastReviewedAt } : {}),
      ...(fm.revisionSummary ? { revisionSummary: fm.revisionSummary } : {}),
    },
    seo: {
      indexingIntent: fm.indexingPolicy === "index" ? "index" : "noindex",
      canonicalPath: `/insights/${slug}`,
      schemaType: fm.schemaType ?? "Article",
      targetQuery: fm.targetQuery,
      searchIntent: fm.searchIntent,
    },
  };

  return ContentDocumentSchema.parse(doc);
}

function main(): void {
  if (!existsSync(CORPUS_DIR)) mkdirSync(CORPUS_DIR, { recursive: true });

  const inventory: Inventory = {
    migratedAt: "2026-09-16",
    sourceBranch: "feat/ctc-cse-convergence-1",
    entries: [],
  };

  const files = readdirSync(INSIGHTS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  let ok = 0;
  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    const source = readFileSync(path.join(INSIGHTS_DIR, file), "utf8");
    const sourceDigest = createHash("sha256").update(source).digest("hex");
    const parsed = matter(source);
    const fm = parsed.data as FrontmatterInputs;
    const mdast = parseMarkdown(parsed.content);
    const compiled = mdastToContentBody(mdast);
    if (compiled.failures.length > 0) {
      throw new Error(
        `[a1r-regenerate-corpus] ${slug}: ingestion failed — ` +
          compiled.failures.map((f) => f.message).join(" ; "),
      );
    }
    const doc = toContentDocument(slug, fm, compiled.blocks, sourceDigest);
    writeFileSync(
      path.join(CORPUS_DIR, `${slug}.json`),
      stableStringify(doc),
      "utf8",
    );
    inventory.entries.push({
      slug,
      path: `content/insights/${file}`,
      sha256: sourceDigest,
    });
    ok += 1;
  }

  inventory.entries.sort((a, b) => a.slug.localeCompare(b.slug));
  writeFileSync(INVENTORY_PATH, stableStringify(inventory), "utf8");
  console.log(`[a1r-regenerate-corpus] ${ok} document(s) regenerated.`);
}

main();
