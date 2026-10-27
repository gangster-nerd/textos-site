// CMO-SURFACE-VERTICAL-SLICE-1 — reading time from editorial body only.
//
// Excludes header, Short Answer, ToC, Sources, Related, Author and CTA — all
// of which live outside `resolved.blocks` OR are opted out here by block kind
// or by consumed-body-section id (Related reading heading + list).
// 225 wpm, ceil, minimum 1.

import type { ResolvedContentSurface } from "../contract/resolved-content-surface";
import type { ContentBlock } from "../contract/content-document";
import { findSourceRelatedSectionFromResolved } from "./related-source-links";

const WORDS_PER_MINUTE = 225;

const EXCLUDED_KINDS: ReadonlySet<string> = new Set([
  "answer",
  "source",
  "cta_slot",
  "related_content_slot",
]);

interface MdastNode {
  type?: string;
  value?: string;
  children?: MdastNode[];
}

function extractText(node: MdastNode | null | undefined): string {
  if (!node) return "";
  if (typeof node.value === "string") return node.value;
  if (Array.isArray(node.children)) {
    return node.children.map(extractText).join(" ");
  }
  return "";
}

function blockText(block: ContentBlock): string {
  const mdast = (block.data as { mdast?: MdastNode } | undefined)?.mdast;
  if (mdast) return extractText(mdast);
  const t = (block.data as { text?: unknown } | undefined)?.text;
  return typeof t === "string" ? t : "";
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

export function computeReadingTimeMinutes(resolved: ResolvedContentSurface): number {
  const src = findSourceRelatedSectionFromResolved(resolved);
  const skip = new Set<string>();
  if (src) {
    skip.add(src.headingBlockId);
    skip.add(src.listBlockId);
  }
  let words = 0;
  for (const rb of resolved.blocks) {
    if (!rb.visible) continue;
    if (skip.has(rb.block.id)) continue;
    if (EXCLUDED_KINDS.has(rb.block.kind)) continue;
    words += countWords(blockText(rb.block));
  }
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
