// A2R-PORT — rich mdast renderer.
//
// Consumes the SEALED typed semantic tree (see contract/mdast-semantic.ts). Every
// node type ratified by the A1R contract is rendered directly into accessible
// HTML. No Markdown reparse. No react-markdown. No stringify-then-parse.
//
// Unknown node types (should never happen — the sealed schema rejects them at
// ingestion) throw `UnsupportedMdastNodeError`. Silent flattening is a bug.

import React, { type ReactElement, type ReactNode } from "react";

import type {
  BlockNode,
  PhrasingNode,
  TextNode,
  StrongNode,
  EmphasisNode,
  LinkNode,
  InlineCodeNode,
  BreakNode,
  ImageNode,
  ParagraphNode,
  HeadingNode,
  ListNode,
  ListItemNode,
  BlockquoteNode,
  TableNode,
  TableRowNode,
  TableCellNode,
  CodeNode,
  ThematicBreakNode,
  HtmlCtaMarkerNode,
  DefinitionNode,
  FootnoteDefinitionNode,
} from "../contract/mdast-semantic";

export class UnsupportedMdastNodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedMdastNodeError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Phrasing (inline)
// ─────────────────────────────────────────────────────────────────────────────

function renderPhrasingList(children: readonly PhrasingNode[]): ReactNode[] {
  return children.map((c, i) => (
    <React.Fragment key={i}>{renderPhrasing(c)}</React.Fragment>
  ));
}

function renderPhrasing(node: PhrasingNode): ReactNode {
  switch (node.type) {
    case "text":
      return (node as TextNode).value;
    case "strong":
      return <strong>{renderPhrasingList((node as StrongNode).children)}</strong>;
    case "emphasis":
      return <em>{renderPhrasingList((node as EmphasisNode).children)}</em>;
    case "link": {
      const n = node as LinkNode;
      return (
        <a href={n.url} title={n.title ?? undefined}>
          {renderPhrasingList(n.children)}
        </a>
      );
    }
    case "inlineCode":
      return <code>{(node as InlineCodeNode).value}</code>;
    case "break":
      return <br />;
    case "image": {
      const n = node as ImageNode;
      return (
        <img
          src={n.url}
          alt={n.alt ?? ""}
          title={n.title ?? undefined}
        />
      );
    }
    default: {
      const _exhaustive: never = node;
      throw new UnsupportedMdastNodeError(
        `unsupported phrasing node: ${JSON.stringify(_exhaustive).slice(0, 80)}`,
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Block-level
// ─────────────────────────────────────────────────────────────────────────────

function renderBlockList(children: readonly BlockNode[]): ReactNode[] {
  return children.map((c, i) => (
    <React.Fragment key={i}>{renderBlock(c)}</React.Fragment>
  ));
}

/** Entry point : render one contracted block node into JSX. */
export function renderBlock(node: BlockNode, opts?: { headingId?: string }): ReactElement {
  switch (node.type) {
    case "paragraph": {
      const n = node as ParagraphNode;
      return <p>{renderPhrasingList(n.children)}</p>;
    }
    case "heading": {
      const n = node as HeadingNode;
      const Tag = (`h${n.depth}` as unknown) as "h2";
      return (
        <Tag id={opts?.headingId}>
          {renderPhrasingList(n.children)}
        </Tag>
      );
    }
    case "list": {
      const n = node as ListNode;
      if (n.ordered) {
        return (
          <ol start={typeof n.start === "number" ? n.start : undefined}>
            {n.children.map((li, i) => (
              <React.Fragment key={i}>{renderListItem(li)}</React.Fragment>
            ))}
          </ol>
        );
      }
      return (
        <ul>
          {n.children.map((li, i) => (
            <React.Fragment key={i}>{renderListItem(li)}</React.Fragment>
          ))}
        </ul>
      );
    }
    case "blockquote": {
      const n = node as BlockquoteNode;
      return <blockquote>{renderBlockList(n.children)}</blockquote>;
    }
    case "table":
      return renderTable(node as TableNode);
    case "code": {
      const n = node as CodeNode;
      return (
        <pre>
          <code data-lang={n.lang ?? undefined}>{n.value}</code>
        </pre>
      );
    }
    case "thematicBreak":
      return <hr aria-hidden="true" />;
    case "html": {
      // The only authorised HTML value is the CTA marker literal ; it is a
      // SEMANTIC placeholder that carries no visible text. The cta_slot block
      // renders the actual CTA in a distinct component ; this html node
      // renders nothing here (returning an empty fragment).
      const n = node as unknown as { type: "html"; value: string };
      if (n.value !== "<!-- cta:contextual -->") {
        throw new UnsupportedMdastNodeError(
          `unauthorised raw HTML in rendered stream: ${String(n.value).slice(0, 40)}`,
        );
      }
      return <React.Fragment />;
    }
    case "image":
      return renderPhrasing(node as ImageNode) as ReactElement;
    case "definition":
    case "footnoteDefinition":
      // Reference definitions are structural and consumed at compile time.
      // At render time they emit nothing.
      return <React.Fragment />;
    default: {
      throw new UnsupportedMdastNodeError(
        `unsupported block node: ${JSON.stringify(node).slice(0, 80)}`,
      );
    }
  }
}

function renderListItem(li: ListItemNode): ReactElement {
  // A tight list item that contains a single paragraph unwraps the paragraph
  // so the emitted `<li>` reads correctly. Loose lists (spread=true) keep the
  // paragraph wrapper. This mirrors the mdast rendering convention.
  const children = li.children;
  if (children.length === 1 && children[0].type === "paragraph" && !li.spread) {
    return <li>{renderPhrasingList((children[0] as ParagraphNode).children)}</li>;
  }
  return <li>{renderBlockList(children)}</li>;
}

function renderTable(n: TableNode): ReactElement {
  const [headerRow, ...bodyRows] = n.children;
  return (
    <table>
      {headerRow ? (
        <thead>
          <tr>
            {headerRow.children.map((cell, i) => (
              <th key={i} scope="col" align={n.align[i] ?? undefined}>
                {renderPhrasingList(cell.children)}
              </th>
            ))}
          </tr>
        </thead>
      ) : null}
      {bodyRows.length > 0 ? (
        <tbody>
          {bodyRows.map((row: TableRowNode, ri) => (
            <tr key={ri}>
              {row.children.map((cell: TableCellNode, ci) => (
                <td key={ci} align={n.align[ci] ?? undefined}>
                  {renderPhrasingList(cell.children)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      ) : null}
    </table>
  );
}

/**
 * Collect visible text from a phrasing subtree — used by the ToC and by
 * render-semantic parity tests.
 */
export function phrasingToPlainText(children: readonly PhrasingNode[]): string {
  let out = "";
  for (const c of children) {
    switch (c.type) {
      case "text":
        out += (c as TextNode).value;
        break;
      case "strong":
        out += phrasingToPlainText((c as StrongNode).children);
        break;
      case "emphasis":
        out += phrasingToPlainText((c as EmphasisNode).children);
        break;
      case "link":
        out += phrasingToPlainText((c as LinkNode).children);
        break;
      case "inlineCode":
        out += (c as InlineCodeNode).value;
        break;
      case "break":
        out += " ";
        break;
      case "image":
        out += (c as ImageNode).alt ?? "";
        break;
    }
  }
  return out;
}

/**
 * Deterministic heading id from the plain-text form of the heading. The renderer
 * dedupes by appending `-2`, `-3`, … on subsequent occurrences (mirrors the A1R
 * fidelity oracle's list-item disambiguation).
 */
export function slugifyHeadingText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function assignHeadingIds(nodes: readonly BlockNode[]): {
  ids: Map<HeadingNode, string>;
  order: Array<{ node: HeadingNode; id: string; text: string; depth: number }>;
} {
  const ids = new Map<HeadingNode, string>();
  const seen = new Map<string, number>();
  const order: Array<{ node: HeadingNode; id: string; text: string; depth: number }> = [];
  const walk = (arr: readonly BlockNode[]) => {
    for (const n of arr) {
      if (n.type === "heading") {
        const h = n as HeadingNode;
        const text = phrasingToPlainText(h.children);
        const base = slugifyHeadingText(text) || `h${order.length + 1}`;
        const count = seen.get(base) ?? 0;
        seen.set(base, count + 1);
        const id = count === 0 ? base : `${base}-${count + 1}`;
        ids.set(h, id);
        order.push({ node: h, id, text, depth: h.depth });
      } else if (n.type === "blockquote") {
        walk((n as BlockquoteNode).children);
      } else if (n.type === "list") {
        for (const li of (n as ListNode).children) {
          walk(li.children);
        }
      }
    }
  };
  walk(nodes);
  return { ids, order };
}
