// A2 — REFERENCE renderer entry point.
//
// renderVersion = "reference@1".
//
// Consumes a ResolvedContentSurface ONLY. Never parses markdown, never reads bundles or
// registries, never inspects Git, never infers publication authority. If a block kind is not
// implemented, the renderer throws (fail-closed) rather than silently dropping content.

import React, { type ReactElement } from "react";

import type { ResolvedContentSurface } from "../contract/resolved-content-surface";
import type { BlockNode, HeadingNode } from "../contract/mdast-semantic";
import { renderBlock } from "./block-renderers";
import { assignHeadingIds } from "./mdast-renderer";

export const RENDER_VERSION = "reference@1" as const;

/**
 * Pre-compute a heading-id map so the H2/H3 anchors emitted in the body match
 * the ToC fragments. Sourced from the SEALED semantic tree (block.data.mdast).
 */
function buildHeadingIdMap(
  resolved: ResolvedContentSurface,
): ReadonlyMap<HeadingNode, string> {
  const roots: BlockNode[] = [];
  for (const rb of resolved.blocks) {
    if (!rb.visible) continue;
    const mdast = (rb.block.data as { mdast?: unknown } | undefined)?.mdast;
    if (mdast && typeof mdast === "object") {
      roots.push(mdast as BlockNode);
    }
  }
  return assignHeadingIds(roots).ids;
}

export interface RenderReferenceBodyProps {
  resolved: ResolvedContentSurface;
  /**
   * A2R : optional in-body CTA renderer, invoked when a primary-cta slot block
   * is encountered. See BlockContext.renderContextualCta.
   */
  renderContextualCta?: (block: import("../contract/content-document").ContentBlock) =>
    | ReactElement
    | null;
}

export function RenderReferenceBody({
  resolved,
  renderContextualCta,
}: RenderReferenceBodyProps): ReactElement {
  const headingIdByNode = buildHeadingIdMap(resolved);
  return (
    <div
      className="cse-body"
      data-cse-render-version={RENDER_VERSION}
      data-cse-policy-id={resolved.policyId}
      data-cse-policy-version={resolved.policyVersion}
      data-cse-content-schema={resolved.contentSchemaVersion}
      data-cse-composition-signature={resolved.compositionSignature}
    >
      {resolved.blocks
        .filter((rb) => rb.visible)
        .map((rb) => (
          <div
            key={rb.block.id}
            className="cse-body__block"
            data-cse-block-id={rb.block.id}
            data-cse-block-kind={rb.block.kind}
            data-cse-region={rb.region ?? undefined}
          >
            {renderBlock(rb.block, {
              documentId: resolved.documentId,
              headingIdByNode,
              renderContextualCta,
            })}
          </div>
        ))}
    </div>
  );
}
