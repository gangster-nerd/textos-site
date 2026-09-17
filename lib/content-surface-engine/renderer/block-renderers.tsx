// A2 — REFERENCE block renderers.
//
// Each function receives a `ResolvedBlock` and returns accessible HTML. They read ONLY
// `block.data` (a producer-provided semantic payload). They never re-parse markdown, never
// touch the file system, never call out. Unknown block kinds throw `UnsupportedBlockKindError`
// so a missing renderer cannot silently drop content.

import React, { type ReactElement } from "react";

import type { ContentBlock } from "../contract/content-document";
import type { BlockNode, HeadingNode } from "../contract/mdast-semantic";
import { UnsupportedBlockKindError } from "./errors";
import {
  renderBlock as renderMdastBlock,
  assignHeadingIds,
  phrasingToPlainText,
} from "./mdast-renderer";

interface BlockContext {
  documentId: string;
  /** A2R : precomputed heading ids so ToC anchors match rendered h2/h3 ids. */
  headingIdByNode?: ReadonlyMap<HeadingNode, string>;
  /**
   * A2R : optional in-body CTA renderer. When a `cta_slot` with `slot="primary-cta"`
   * is encountered inside the flow, this callback is invoked to render the real
   * contextual CTA card in place of the empty placeholder. Returns `null` when
   * the caller does not want to render a CTA there.
   */
  renderContextualCta?: (block: ContentBlock) => React.ReactElement | null;
}

function mdastNode(block: ContentBlock): BlockNode | undefined {
  const carried = (block.data as { mdast?: unknown } | undefined)?.mdast;
  return carried as BlockNode | undefined;
}

function stringField(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  return typeof value === "string" ? value : "";
}

function stringArrayField(data: Record<string, unknown>, key: string): readonly string[] {
  const value = data[key];
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function renderParagraph(block: ContentBlock, _ctx: BlockContext): ReactElement {
  const nd = mdastNode(block);
  if (nd?.type === "paragraph") {
    return (
      <div className="cse-block cse-block--paragraph">
        {renderMdastBlock(nd)}
      </div>
    );
  }
  return <p className="cse-block cse-block--paragraph">{stringField(block.data, "text")}</p>;
}

function renderHeading(block: ContentBlock, ctx: BlockContext): ReactElement {
  const nd = mdastNode(block);
  if (nd?.type === "heading") {
    const id = ctx.headingIdByNode?.get(nd) ?? block.id;
    return (
      <div className="cse-block cse-block--heading">
        {renderMdastBlock(nd, { headingId: id })}
      </div>
    );
  }
  const level = Math.min(6, Math.max(2, block.level ?? 2));
  const text = stringField(block.data, "text");
  const Tag = (`h${level}` as unknown) as "h2";
  return (
    <Tag className="cse-block cse-block--heading" id={block.id}>
      {text}
    </Tag>
  );
}

function renderAnswer(block: ContentBlock): ReactElement {
  return (
    <section
      className="cse-block cse-block--answer"
      aria-labelledby={`${block.id}-label`}
    >
      <p id={`${block.id}-label`} className="cse-block__label">
        Short answer
      </p>
      <p className="cse-block__lede">{stringField(block.data, "text")}</p>
    </section>
  );
}

function renderEvidence(block: ContentBlock): ReactElement {
  const ref = stringField(block.data, "ref");
  const summary = stringField(block.data, "summary");
  return (
    <figure className="cse-block cse-block--evidence" data-evidence-ref={ref}>
      {summary ? <figcaption className="cse-block__caption">{summary}</figcaption> : null}
      <p className="cse-block__evidence-ref">
        <span className="cse-block__label">Evidence</span> {ref}
      </p>
    </figure>
  );
}

function renderQuote(block: ContentBlock): ReactElement {
  const nd = mdastNode(block);
  if (nd?.type === "blockquote") {
    return <div className="cse-block cse-block--quote">{renderMdastBlock(nd)}</div>;
  }
  const attribution = stringField(block.data, "attribution");
  return (
    <blockquote className="cse-block cse-block--quote">
      <p>{stringField(block.data, "text")}</p>
      {attribution ? <cite className="cse-block__caption">{attribution}</cite> : null}
    </blockquote>
  );
}

function renderFigure(block: ContentBlock): ReactElement {
  const alt = stringField(block.data, "alt");
  const src = stringField(block.data, "src");
  const caption = stringField(block.data, "caption");
  return (
    <figure className="cse-block cse-block--figure">
      {src ? <img src={src} alt={alt} /> : <p role="note">figure without src ({alt})</p>}
      {caption ? <figcaption className="cse-block__caption">{caption}</figcaption> : null}
    </figure>
  );
}

function renderComparison(block: ContentBlock): ReactElement {
  const rows = block.data.rows;
  if (!Array.isArray(rows)) {
    return <p className="cse-block cse-block--comparison" role="note">comparison with no rows</p>;
  }
  return (
    <div className="cse-block cse-block--comparison" role="group" aria-label="Comparison">
      <table>
        <tbody>
          {rows.map((row, i) => {
            const label = typeof row === "object" && row !== null && "label" in row
              ? String((row as { label: unknown }).label ?? "")
              : "";
            const a = typeof row === "object" && row !== null && "a" in row
              ? String((row as { a: unknown }).a ?? "")
              : "";
            const b = typeof row === "object" && row !== null && "b" in row
              ? String((row as { b: unknown }).b ?? "")
              : "";
            return (
              <tr key={i}>
                <th scope="row">{label}</th>
                <td>{a}</td>
                <td>{b}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function renderTable(block: ContentBlock): ReactElement {
  const headers = stringArrayField(block.data, "headers");
  const rowsRaw = block.data.rows;
  const rows = Array.isArray(rowsRaw)
    ? rowsRaw.map((r) => (Array.isArray(r) ? r.map(String) : []))
    : [];
  return (
    <div className="cse-block cse-block--table">
      <table>
        {headers.length > 0 ? (
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderSteps(block: ContentBlock): ReactElement {
  const nd = mdastNode(block);
  if (nd?.type === "list") {
    return <div className="cse-block cse-block--steps">{renderMdastBlock(nd)}</div>;
  }
  const items = stringArrayField(block.data, "items");
  return (
    <ol className="cse-block cse-block--steps">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ol>
  );
}

function renderCallout(block: ContentBlock): ReactElement {
  const nd = mdastNode(block);
  if (nd?.type === "code" || nd?.type === "thematicBreak") {
    return <div className="cse-block cse-block--callout">{renderMdastBlock(nd)}</div>;
  }
  const tone = stringField(block.data, "tone") || "info";
  return (
    <aside
      className={`cse-block cse-block--callout cse-block--callout-${tone}`}
      role="note"
      aria-label={stringField(block.data, "title") || "Note"}
    >
      {block.data.title ? (
        <p className="cse-block__label">{stringField(block.data, "title")}</p>
      ) : null}
      <p>{stringField(block.data, "text")}</p>
    </aside>
  );
}

function renderDefinition(block: ContentBlock): ReactElement {
  return (
    <dl className="cse-block cse-block--definition">
      <dt>{stringField(block.data, "term")}</dt>
      <dd>{stringField(block.data, "definition")}</dd>
    </dl>
  );
}

function renderStatistic(block: ContentBlock): ReactElement {
  return (
    <p
      className="cse-block cse-block--statistic"
      aria-label={stringField(block.data, "label") || "statistic"}
    >
      <span className="cse-block__stat-value">{stringField(block.data, "value")}</span>{" "}
      <span className="cse-block__stat-label">{stringField(block.data, "label")}</span>
    </p>
  );
}

function renderSource(block: ContentBlock): ReactElement {
  const ref = stringField(block.data, "ref");
  const title = stringField(block.data, "title") || ref;
  const href = stringField(block.data, "href");
  return (
    <p className="cse-block cse-block--source">
      <span className="cse-block__label">Source</span>{" "}
      {href ? (
        <a href={href} rel="noopener">
          {title}
        </a>
      ) : (
        <span>{title}</span>
      )}
    </p>
  );
}

// cta_slot and related_content_slot are STRUCTURAL PLACEHOLDERS. The block renderer emits an
// anchor element only. The actual CTA or related-content is rendered by the TextOS-managed
// surface (see managed-surface.tsx) using the CSE conversion / relationships facilities.
function renderCtaSlot(block: ContentBlock, ctx: BlockContext): ReactElement {
  // A2R : when the surface provides a `renderContextualCta` callback and the
  // slot is "primary-cta", emit the real CTA card here (in-body). Otherwise
  // keep the empty placeholder so downstream tooling / diagnostics can locate
  // the slot without a rendered CTA.
  if (block.slot === "primary-cta" && ctx.renderContextualCta) {
    const rendered = ctx.renderContextualCta(block);
    if (rendered) {
      return (
        <div
          className="cse-block cse-block--cta-slot cse-block--cta-slot-inline"
          data-cse-slot="primary-cta"
          data-cse-block-id={block.id}
        >
          {rendered}
        </div>
      );
    }
  }
  return (
    <div
      className="cse-block cse-block--cta-slot"
      data-cse-slot={block.slot ?? "cta"}
      data-cse-block-id={block.id}
      aria-hidden="true"
    />
  );
}

function renderRelatedSlot(block: ContentBlock): ReactElement {
  return (
    <div
      className="cse-block cse-block--related-slot"
      data-cse-slot="related"
      data-cse-block-id={block.id}
      aria-hidden="true"
    />
  );
}

export function renderBlock(block: ContentBlock, ctx: BlockContext): ReactElement {
  switch (block.kind) {
    case "paragraph":
      return renderParagraph(block, ctx);
    case "heading":
      return renderHeading(block, ctx);
    case "answer":
      return renderAnswer(block);
    case "evidence":
      return renderEvidence(block);
    case "quote":
      return renderQuote(block);
    case "figure":
      return renderFigure(block);
    case "comparison":
      return renderComparison(block);
    case "table":
      return renderTable(block);
    case "steps":
      return renderSteps(block);
    case "callout":
      return renderCallout(block);
    case "definition":
      return renderDefinition(block);
    case "statistic":
      return renderStatistic(block);
    case "source":
      return renderSource(block);
    case "cta_slot":
      return renderCtaSlot(block, ctx);
    case "related_content_slot":
      return renderRelatedSlot(block);
    default: {
      const exhaustive: never = block.kind;
      throw new UnsupportedBlockKindError(block.id, exhaustive);
    }
  }
}
