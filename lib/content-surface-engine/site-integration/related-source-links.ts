// CMO-SURFACE-VERTICAL-SLICE-1 REVIEW FIX — governed outbound links from the
// article body's trailing "Related …" section.
//
// The corpus authors sometimes commit a `## Related reading` (or `## Related
// methodology`, etc.) heading followed by a list of governed external hrefs
// (/methodology/*, /faq/*, /insights/*). We do NOT render that presentation
// section a second time in the article body — but the LINKS it carries are
// governed content and must be preserved. This module gives the managed
// surface (a) the block ids to consume from the body and (b) the governed
// links to feed as a fallback into the Related module when the computed graph
// has no publishable result.
//
// Recognition is intentionally narrow:
//   1. The heading text (case-insensitive, trimmed) must exactly match one of
//      the closed set of "Related <topic>" section titles. A generic "Related"
//      is NOT treated as a managed trailing section.
//   2. The immediately following block must be a list/steps structure. If
//      absent, the heading is left alone.
//
// No slug-specific logic. No mdast mutation.

import type { ContentDocument, ContentBlock } from "../contract/content-document";
import type { ResolvedContentSurface } from "../contract/resolved-content-surface";

const RELATED_SECTION_TITLES: ReadonlySet<string> = new Set([
  "related reading",
  "related methodology",
  "related faq",
  "related resources",
  "related content",
  "related insights",
]);

interface MdastNode {
  type?: string;
  value?: string;
  url?: string;
  children?: MdastNode[];
}

function extractText(node: MdastNode | null | undefined): string {
  if (!node) return "";
  if (typeof node.value === "string") return node.value;
  if (Array.isArray(node.children)) return node.children.map(extractText).join(" ");
  return "";
}

function collectLinks(node: MdastNode | null | undefined, out: { href: string; title: string }[]): void {
  if (!node || typeof node !== "object") return;
  if (node.type === "link" && typeof node.url === "string") {
    const title = extractText(node).trim();
    out.push({ href: node.url, title });
  }
  if (Array.isArray(node.children)) for (const c of node.children) collectLinks(c, out);
}

function headingText(block: ContentBlock): string {
  const mdast = (block.data as { mdast?: MdastNode } | undefined)?.mdast;
  if (mdast) return extractText(mdast).toLowerCase().trim();
  const t = (block.data as { text?: unknown } | undefined)?.text;
  return (typeof t === "string" ? t : "").toLowerCase().trim();
}

function isListBlock(block: ContentBlock): boolean {
  const mdast = (block.data as { mdast?: MdastNode } | undefined)?.mdast;
  const t = mdast?.type;
  return t === "list";
}

export interface SourceRelatedSection {
  headingBlockId: string;
  listBlockId: string;
  headingLabel: string;
  links: readonly { href: string; title: string }[];
}

function findSourceRelatedIn(body: readonly ContentBlock[]): SourceRelatedSection | null {
  for (let i = 0; i < body.length; i++) {
    const b = body[i];
    if (b.kind !== "heading") continue;
    const t = headingText(b);
    if (!RELATED_SECTION_TITLES.has(t)) continue;
    const next = body[i + 1];
    if (!next || !isListBlock(next)) continue;
    const links: { href: string; title: string }[] = [];
    const mdast = (next.data as { mdast?: MdastNode } | undefined)?.mdast;
    collectLinks(mdast, links);
    if (links.length === 0) return null;
    return {
      headingBlockId: b.id,
      listBlockId: next.id,
      headingLabel: t,
      links,
    };
  }
  return null;
}

export function findSourceRelatedSection(document: ContentDocument): SourceRelatedSection | null {
  return findSourceRelatedIn(document.body);
}

export function findSourceRelatedSectionFromResolved(
  resolved: ResolvedContentSurface,
): SourceRelatedSection | null {
  const body = resolved.blocks
    .filter((rb) => rb.visible)
    .map((rb) => rb.block);
  return findSourceRelatedIn(body);
}
