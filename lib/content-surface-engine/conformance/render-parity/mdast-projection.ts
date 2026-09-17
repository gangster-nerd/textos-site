// A2R-SURFACE-SEAL-1 — mdast → semantic projection.
//
// Deterministic mirror of `html-projection.ts` for the SOURCE side of the
// exact-parity oracle. Same normalized shape so a deep-equal comparison is
// meaningful.

import type {
  BlockNode,
  PhrasingNode,
  ListNode,
  BlockquoteNode,
  TableNode,
  CodeNode,
  HeadingNode,
  ParagraphNode,
  ImageNode,
} from "../../contract/mdast-semantic";

import type {
  ProjectedBlock,
  ProjectedListItem,
  ProjectedPhrasing,
} from "./html-projection";

export function projectMdastBlock(node: BlockNode): ProjectedBlock | null {
  switch (node.type) {
    case "paragraph":
      return {
        type: "paragraph",
        children: (node as ParagraphNode).children.map(projectMdastPhrasing).flat(),
      };
    case "heading": {
      const h = node as HeadingNode;
      return {
        type: "heading",
        depth: h.depth,
        children: h.children.map(projectMdastPhrasing).flat(),
      };
    }
    case "list": {
      const l = node as ListNode;
      const items: ProjectedListItem[] = l.children.map((li) => ({
        type: "listItem",
        children: li.children
          .map((c) => projectMdastBlock(c))
          .filter((c): c is ProjectedBlock => c !== null),
      }));
      return {
        type: "list",
        ordered: l.ordered,
        start: l.start ?? null,
        children: items,
      };
    }
    case "blockquote":
      return {
        type: "blockquote",
        children: (node as BlockquoteNode).children
          .map(projectMdastBlock)
          .filter((c): c is ProjectedBlock => c !== null),
      };
    case "table": {
      const t = node as TableNode;
      return {
        type: "table",
        children: t.children.map((row) => ({
          type: "tableRow",
          children: row.children.map((cell) => ({
            type: "tableCell",
            children: cell.children.map(projectMdastPhrasing).flat(),
          })),
        })),
      };
    }
    case "code":
      return { type: "code", value: (node as CodeNode).value };
    case "thematicBreak":
      return { type: "thematicBreak" };
    case "image": {
      const img = node as ImageNode;
      return {
        type: "image",
        url: img.url,
        alt: img.alt ?? null,
        title: img.title ?? null,
      };
    }
    case "html":
      // The governed CTA marker is realised via its slot; it emits no visible
      // semantic content and therefore contributes NOTHING to the projection.
      return null;
    case "definition":
    case "footnoteDefinition":
      // Reference definitions emit no visible content at render time.
      return null;
    default:
      return null;
  }
}

export function projectMdastPhrasing(node: PhrasingNode): ProjectedPhrasing[] {
  switch (node.type) {
    case "text": {
      // Match `html-projection` whitespace normalization : collapse consecutive
      // whitespace to a single space.
      const value = node.value.replace(/\s+/g, " ");
      return value === "" ? [] : [{ type: "text", value }];
    }
    case "break":
      return [{ type: "break" }];
    case "inlineCode":
      return [{ type: "inlineCode", value: node.value }];
    case "strong":
      return [
        {
          type: "strong",
          children: node.children.map(projectMdastPhrasing).flat(),
        },
      ];
    case "emphasis":
      return [
        {
          type: "emphasis",
          children: node.children.map(projectMdastPhrasing).flat(),
        },
      ];
    case "link":
      return [
        {
          type: "link",
          url: node.url,
          title: node.title ?? null,
          children: node.children.map(projectMdastPhrasing).flat(),
        },
      ];
    case "image":
      return [
        {
          type: "image",
          url: node.url,
          alt: node.alt ?? null,
          title: node.title ?? null,
        },
      ];
    default:
      return [];
  }
}
