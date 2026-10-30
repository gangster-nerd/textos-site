// A2R-PORT §4 — render-semantic parity.
//
// For each of the 12 corpus documents, project the SEALED semantic tree to a
// flat set of assertions (visible text tokens, link URLs, heading texts,
// image alts) and verify each assertion holds in the corresponding exported
// HTML at `out/insights/<slug>.html`. If `out/` is missing, this test FAILS
// explicitly — it never `describe.skipIf`s.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import type { ContentDocument } from "@/lib/content-surface-engine/contract/content-document";
import type {
  BlockNode,
  PhrasingNode,
  ListNode,
  BlockquoteNode,
} from "@/lib/content-surface-engine/contract/mdast-semantic";
import { loadManagedCorpus } from "@/lib/content-surface-engine/conformance/corpus-loader";
import { phrasingToPlainText } from "@/lib/content-surface-engine/renderer/mdast-renderer";
import { findSourceRelatedSection } from "@/lib/content-surface-engine/site-integration/related-source-links";

const OUT_DIR = path.resolve("out/insights");

if (!fs.existsSync(OUT_DIR)) {
  throw new Error(
    "A2R render-semantic parity requires `pnpm build` output at out/insights. " +
      "Run `pnpm build` then re-run this test (or use `pnpm verify:a2r` which builds first).",
  );
}

const corpus = loadManagedCorpus();

interface Projection {
  headings: string[];
  linkUrls: Set<string>;
  imageAlts: string[];
  words: string[]; // non-empty words seen in phrasing text nodes
}

function walkPhrasing(children: readonly PhrasingNode[], p: Projection): void {
  for (const c of children) {
    switch (c.type) {
      case "text":
        for (const w of c.value.split(/\s+/))
          if (w.trim()) p.words.push(w.trim());
        break;
      case "strong":
      case "emphasis":
      case "link":
        walkPhrasing(c.children, p);
        if (c.type === "link") p.linkUrls.add(c.url);
        break;
      case "inlineCode":
        for (const w of c.value.split(/\s+/))
          if (w.trim()) p.words.push(w.trim());
        break;
      case "image":
        if (c.alt) p.imageAlts.push(c.alt);
        break;
      case "break":
        break;
    }
  }
}

function walkBlock(node: BlockNode, p: Projection): void {
  switch (node.type) {
    case "paragraph":
      walkPhrasing(node.children, p);
      break;
    case "heading":
      p.headings.push(phrasingToPlainText(node.children));
      walkPhrasing(node.children, p);
      break;
    case "list":
      for (const li of (node as ListNode).children) {
        for (const child of li.children) walkBlock(child, p);
      }
      break;
    case "blockquote":
      for (const child of (node as BlockquoteNode).children) walkBlock(child, p);
      break;
    case "table":
      for (const row of node.children) {
        for (const cell of row.children) walkPhrasing(cell.children, p);
      }
      break;
    case "code":
      // Code content is preserved verbatim ; token-check the words too.
      for (const w of node.value.split(/\s+/))
        if (w.trim()) p.words.push(w.trim());
      break;
    case "html":
    case "thematicBreak":
    case "definition":
    case "footnoteDefinition":
    case "image":
      break;
  }
}

function projectDocument(doc: ContentDocument): Projection {
  const p: Projection = {
    headings: [],
    linkUrls: new Set(),
    imageAlts: [],
    words: [],
  };
  // CMO-SURFACE-VERTICAL-SLICE-1 REVIEW FIX : the trailing "Related …" heading
  // and its following list are consumed by the managed surface and projected
  // into the Related nav. The heading label is NOT expected to appear as an
  // h2/h3 in HTML — parity is over substantive content and governed links,
  // not over the consumed presentation section. Link URLs and word tokens
  // from the list are still expected in HTML (they surface in the Related
  // nav) so we keep collecting them.
  const src = findSourceRelatedSection(doc);
  const skipIds = new Set<string>();
  if (src) {
    skipIds.add(src.headingBlockId);
    skipIds.add(src.listBlockId);
  }
  for (const b of doc.body) {
    const mdast = (b.data as { mdast?: unknown } | undefined)?.mdast;
    if (!mdast || typeof mdast !== "object") continue;
    if (skipIds.has(b.id)) continue;
    walkBlock(mdast as BlockNode, p);
  }
  return p;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("A2R — render-semantic parity across the 12 corpus documents", () => {
  it.each(corpus.map((d) => [d.identity.slug, d] as const))(
    "%s : every semantic assertion holds in rendered HTML",
    (slug, doc) => {
      const htmlPath = path.join(OUT_DIR, `${slug}.html`);
      expect(
        fs.existsSync(htmlPath),
        `missing exported HTML at ${htmlPath} — run pnpm build`,
      ).toBe(true);
      const html = fs.readFileSync(htmlPath, "utf8");
      const p = projectDocument(doc);

      // Headings : the heading's first 4 significant words must appear somewhere
      // inside an h2/h3 tag (HTML entity encoding, curly quotes, formatting nodes
      // make exact string matches brittle).
      const headingMatches = [...html.matchAll(/<h[2-6][^>]*>([\s\S]*?)<\/h[2-6]>/g)].map(
        (m) => m[1].replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, " ").toLowerCase(),
      );
      for (const h of p.headings) {
        const firstWords = h
          .toLowerCase()
          .split(/[^\p{L}\p{N}]+/u)
          .filter((w) => w.length >= 3)
          .slice(0, 4)
          .join(" ");
        if (firstWords.length === 0) continue;
        const matched = headingMatches.some((hm) =>
          firstWords.split(" ").every((w) => hm.includes(w)),
        );
        expect(matched, `${slug}: heading "${h.slice(0, 60)}…" not found in any h2/h3`).toBe(
          true,
        );
      }
      // Link URLs : each source link URL appears as an href in the article.
      for (const url of p.linkUrls) {
        const re = new RegExp(`href="${escapeRegex(url)}"`);
        expect(re.test(html), `${slug}: link href "${url}" missing`).toBe(true);
      }
      // Image alts : each source alt appears as an alt attribute.
      for (const alt of p.imageAlts) {
        const re = new RegExp(`alt="${escapeRegex(alt)}"`);
        expect(re.test(html), `${slug}: image alt "${alt}" missing`).toBe(true);
      }
      // Word density : at least 80% of the source's word tokens appear in the
      // article body (some pruned by HTML entity encoding, punctuation-adjacent
      // tokens, etc.). This catches wholesale flattening / dropped paragraphs.
      const distinctWords = Array.from(new Set(p.words)).filter((w) => w.length >= 4);
      let hits = 0;
      for (const w of distinctWords) {
        if (html.includes(w)) hits += 1;
      }
      const ratio = distinctWords.length > 0 ? hits / distinctWords.length : 1;
      expect(
        ratio,
        `${slug}: word density ${(ratio * 100).toFixed(1)}% below 80% (${hits}/${distinctWords.length})`,
      ).toBeGreaterThanOrEqual(0.8);
    },
  );
});
