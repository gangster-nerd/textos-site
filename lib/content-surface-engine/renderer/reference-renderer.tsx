// CSE-2 — REFERENCE renderer entry point.
//
// renderVersion = "reference@1".
//
// Consumes a ResolvedContentSurface ONLY. Never parses markdown, never reads bundles or
// registries, never inspects Git, never infers publication authority. If a block kind is not
// implemented, the renderer throws (fail-closed) rather than silently dropping content.

import React, { type ReactElement } from "react";

import type { ResolvedContentSurface } from "../contract/resolved-content-surface";
import { renderBlock } from "./block-renderers";

export const RENDER_VERSION = "reference@1" as const;

export interface RenderReferenceBodyProps {
  resolved: ResolvedContentSurface;
}

export function RenderReferenceBody({ resolved }: RenderReferenceBodyProps): ReactElement {
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
            {renderBlock(rb.block, { documentId: resolved.documentId })}
          </div>
        ))}
    </div>
  );
}
