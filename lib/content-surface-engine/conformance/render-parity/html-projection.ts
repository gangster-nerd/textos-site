// A2R-SURFACE-SEAL-1 — HTML → semantic-tree projection.
//
// The A2R exact-parity oracle needs a deterministic inverse of the CSE renderer:
// given the exported HTML for one ContentBlock, project it back to a normalized
// semantic tree (mdast-compatible subset) that can be compared to the source
// semantic subtree carried under `ContentBlock.data.mdast`.
//
// Presentation-only wrappers are stripped :
//   - `<div class="cse-body__block ...">` around every block
//   - `<div class="cse-block cse-block--*">` (paragraph, heading, quote, steps,
//     callout) that wraps mdast content
//
// Semantic structure is NOT ignored : block sequence, paragraph boundaries,
// heading depth/text/order, strong / emphasis / inlineCode / hard break, link
// href/title/children, list ordered+start+nested, listItem boundaries,
// blockquote children, table row/cell order and content, code, images.
//
// This module is used by:
//   - `evaluateRenderParity` (the exact-parity gate)
//   - `tests/a2r-surface-mutations.test.ts` (mutation regression corpus)

import * as cheerio from "cheerio";

export interface ProjectedText {
  type: "text";
  value: string;
}
export interface ProjectedBreak {
  type: "break";
}
export interface ProjectedInlineCode {
  type: "inlineCode";
  value: string;
}
export interface ProjectedStrong {
  type: "strong";
  children: ProjectedPhrasing[];
}
export interface ProjectedEmphasis {
  type: "emphasis";
  children: ProjectedPhrasing[];
}
export interface ProjectedLink {
  type: "link";
  url: string;
  title: string | null;
  children: ProjectedPhrasing[];
}
export interface ProjectedImage {
  type: "image";
  url: string;
  alt: string | null;
  title: string | null;
}

export type ProjectedPhrasing =
  | ProjectedText
  | ProjectedBreak
  | ProjectedInlineCode
  | ProjectedStrong
  | ProjectedEmphasis
  | ProjectedLink
  | ProjectedImage;

export interface ProjectedParagraph {
  type: "paragraph";
  children: ProjectedPhrasing[];
}
export interface ProjectedHeading {
  type: "heading";
  depth: number;
  children: ProjectedPhrasing[];
}
export interface ProjectedListItem {
  type: "listItem";
  children: ProjectedBlock[];
}
export interface ProjectedList {
  type: "list";
  ordered: boolean;
  start: number | null;
  children: ProjectedListItem[];
}
export interface ProjectedBlockquote {
  type: "blockquote";
  children: ProjectedBlock[];
}
export interface ProjectedTableCell {
  type: "tableCell";
  children: ProjectedPhrasing[];
}
export interface ProjectedTableRow {
  type: "tableRow";
  children: ProjectedTableCell[];
}
export interface ProjectedTable {
  type: "table";
  children: ProjectedTableRow[];
}
export interface ProjectedCode {
  type: "code";
  value: string;
}
export interface ProjectedThematicBreak {
  type: "thematicBreak";
}

export type ProjectedBlock =
  | ProjectedParagraph
  | ProjectedHeading
  | ProjectedList
  | ProjectedBlockquote
  | ProjectedTable
  | ProjectedCode
  | ProjectedThematicBreak
  | ProjectedImage;

// Cheerio's exported types shift between versions ; we lean on `any` for the
// wrapper handle since the projection is a pure walk over the DOM tree.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Cheer = any;

/** Load the article HTML fragment we scope projection to. */
export function loadArticleFragment(html: string) {
  return cheerio.load(html);
}

/**
 * Extract the DOM node representing a specific ContentBlock in the rendered
 * output. Returns `null` when the block was intentionally NOT rendered (the
 * A1R Markdown compiler emits a `related_content_slot` synthetic block whose
 * body flow position carries no `data-cse-block-id` — but source-backed blocks
 * always do).
 */
export function findBlockNode(
  $: ReturnType<typeof cheerio.load>,
  blockId: string,
): Cheer | null {
  const found = $(`[data-cse-block-id="${cssEscape(blockId)}"]`);
  return found.length > 0 ? found.first() : null;
}

function cssEscape(id: string): string {
  return id.replace(/(["\\])/g, "\\$1");
}

/**
 * Project a block-wrapper DOM subtree to a semantic block. The wrapper is
 * `<div class="cse-body__block" data-cse-block-id="...">` ; inside it, the
 * renderer may have added another wrapper `<div class="cse-block cse-block--*">`
 * around the actual semantic content. Both wrappers are STRIPPED here.
 */
export function projectBlock(
  $: ReturnType<typeof cheerio.load>,
  el: Cheer,
): ProjectedBlock | null {
  // Descend past presentation wrappers.
  const semanticRoot = descendPresentationWrappers($, el);
  if (semanticRoot === null) return null;
  return projectSemanticElement($, semanticRoot);
}

/** Descend past presentation-only `<div>` wrappers used by CSE. */
function descendPresentationWrappers(
  $: ReturnType<typeof cheerio.load>,
  el: Cheer,
): Cheer | null {
  let cur = el;
  while (cur.length > 0) {
    const node = cur.get(0);
    if (!node || node.type !== "tag") return null;
    const tag = (node as { name: string }).name;
    const className = (cur.attr("class") ?? "") as string;
    const isPresentationWrapper =
      tag === "div" &&
      (className.includes("cse-body__block") ||
        className.includes("cse-block--paragraph") ||
        className.includes("cse-block--heading") ||
        className.includes("cse-block--quote") ||
        className.includes("cse-block--steps") ||
        className.includes("cse-block--callout"));
    if (!isPresentationWrapper) return cur;
    // Descend into the sole element child ; ignore whitespace text nodes.
    const kids = cur.children();
    if (kids.length === 0) return null;
    cur = kids.first();
  }
  return null;
}

function projectSemanticElement(
  $: ReturnType<typeof cheerio.load>,
  el: Cheer,
): ProjectedBlock | null {
  const node = el.get(0);
  if (!node || node.type !== "tag") return null;
  const tag = (node as { name: string }).name.toLowerCase();
  switch (tag) {
    case "p":
      return { type: "paragraph", children: projectPhrasingChildren($, el) };
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      return {
        type: "heading",
        depth: Number(tag[1]),
        children: projectPhrasingChildren($, el),
      };
    case "ul":
    case "ol": {
      const startAttr = el.attr("start");
      const items: ProjectedListItem[] = [];
      el.children("li").each((_: number, li: any) => {
        items.push(projectListItem($, $(li)));
      });
      return {
        type: "list",
        ordered: tag === "ol",
        start: startAttr ? Number(startAttr) : null,
        children: items,
      };
    }
    case "blockquote": {
      const kids: ProjectedBlock[] = [];
      el.children().each((_: number, child: any) => {
        const projected = projectSemanticElement($, $(child));
        if (projected) kids.push(projected);
      });
      return { type: "blockquote", children: kids };
    }
    case "table": {
      const rows: ProjectedTableRow[] = [];
      el.find("tr").each((_: number, tr: any) => {
        const cells: ProjectedTableCell[] = [];
        $(tr)
          .find("th, td")
          .each((_ci: number, cell: any) => {
            cells.push({
              type: "tableCell",
              children: projectPhrasingChildren($, $(cell)),
            });
          });
        rows.push({ type: "tableRow", children: cells });
      });
      return { type: "table", children: rows };
    }
    case "pre": {
      const codeEl = el.find("code").first();
      return { type: "code", value: (codeEl.text() ?? "").replace(/\n+$/, "") };
    }
    case "hr":
      return { type: "thematicBreak" };
    case "img":
      return {
        type: "image",
        url: el.attr("src") ?? "",
        alt: el.attr("alt") ?? null,
        title: el.attr("title") ?? null,
      } as ProjectedImage;
    default:
      // Unknown semantic tag reaching projection ⇒ fail-closed by returning
      // null ; the parity comparator treats null as "missing" and reports a diff.
      return null;
  }
}

function projectListItem(
  $: ReturnType<typeof cheerio.load>,
  li: Cheer,
): ProjectedListItem {
  // Tight list items unwrap a single paragraph — the renderer emits phrasing
  // directly inside `<li>`. Loose items keep block children. We inspect the
  // first non-whitespace child : if it's a `<p>`, treat contents as a
  // paragraph ; otherwise walk block children.
  const contents = li.contents();
  const kids: ProjectedBlock[] = [];
  // Case A : first meaningful child is a `<p>` → the li's semantic children
  // are exactly the paragraphs and block children of the li.
  let hasBlock = false;
  contents.each((_: number, c: any) => {
    if (c.type !== "tag") return;
    const tagName = (c as { name: string }).name.toLowerCase();
    if (
      tagName === "p" ||
      tagName === "ul" ||
      tagName === "ol" ||
      tagName === "blockquote" ||
      tagName === "pre" ||
      tagName === "table"
    ) {
      hasBlock = true;
    }
  });
  if (hasBlock) {
    contents.each((_: number, c: any) => {
      if (c.type !== "tag") return;
      const projected = projectSemanticElement($, $(c));
      if (projected) kids.push(projected);
    });
  } else {
    // Tight : wrap phrasing in a virtual paragraph.
    kids.push({ type: "paragraph", children: projectPhrasingChildren($, li) });
  }
  return { type: "listItem", children: kids };
}

function projectPhrasingChildren(
  $: ReturnType<typeof cheerio.load>,
  el: Cheer,
): ProjectedPhrasing[] {
  const out: ProjectedPhrasing[] = [];
  el.contents().each((_: number, c: any) => {
    if (c.type === "text") {
      const value = ((c as { data?: string }).data ?? "").replace(/\s+/g, " ");
      // Preserve leading/trailing single space if present ; the comparator
      // normalizes consecutive text nodes below.
      if (value !== "") out.push({ type: "text", value });
    } else if (c.type === "tag") {
      const tag = (c as { name: string }).name.toLowerCase();
      const child = $(c);
      switch (tag) {
        case "strong":
        case "b":
          out.push({ type: "strong", children: projectPhrasingChildren($, child) });
          break;
        case "em":
        case "i":
          out.push({ type: "emphasis", children: projectPhrasingChildren($, child) });
          break;
        case "a": {
          const url = child.attr("href") ?? "";
          const title = child.attr("title") ?? null;
          out.push({
            type: "link",
            url,
            title,
            children: projectPhrasingChildren($, child),
          });
          break;
        }
        case "code": {
          // Inline `<code>` (not inside `<pre>`). Its value is the text content.
          out.push({ type: "inlineCode", value: child.text() });
          break;
        }
        case "br":
          out.push({ type: "break" });
          break;
        case "img":
          out.push({
            type: "image",
            url: child.attr("src") ?? "",
            alt: child.attr("alt") ?? null,
            title: child.attr("title") ?? null,
          });
          break;
        // Anchor tag inside a heading — the mdast renderer wraps every h2 in
        // a self-link (`href="#..."`). For projection purposes we treat the
        // wrapper as transparent — the semantic value is its children.
        default:
          // Recurse — any wrapper (span, etc.) is transparent for phrasing.
          for (const gc of projectPhrasingChildren($, child)) out.push(gc);
      }
    }
  });
  return collapsePhrasing(out);
}

/**
 * Collapse consecutive text nodes and trim purely-whitespace leading/trailing
 * text so the comparison is stable regardless of whitespace between inline
 * elements in the emitted HTML.
 */
function collapsePhrasing(children: ProjectedPhrasing[]): ProjectedPhrasing[] {
  const merged: ProjectedPhrasing[] = [];
  for (const c of children) {
    const last = merged[merged.length - 1];
    if (last && last.type === "text" && c.type === "text") {
      last.value = `${last.value}${c.value}`;
      continue;
    }
    merged.push(c);
  }
  // Trim leading/trailing whitespace on text edges — keeps inner whitespace.
  if (merged.length > 0) {
    const first = merged[0];
    if (first.type === "text") first.value = first.value.replace(/^\s+/, "");
    const last = merged[merged.length - 1];
    if (last.type === "text") last.value = last.value.replace(/\s+$/, "");
    if (first.type === "text" && first.value === "") merged.shift();
    if (
      merged.length > 0 &&
      merged[merged.length - 1].type === "text" &&
      (merged[merged.length - 1] as ProjectedText).value === ""
    ) {
      merged.pop();
    }
  }
  return merged;
}
