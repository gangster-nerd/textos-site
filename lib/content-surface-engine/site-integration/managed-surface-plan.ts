// CMO-SURFACE-VERTICAL-SLICE-1 REVIEW FIX — narrow trailing-section detection.
//
// Only two things are ever consumed from the article body :
//   (a) the "Related …" heading + its immediately following list block, when
//       recognised by related-source-links.ts ;
//   (b) the governed `source` blocks, which the surface's own Sources module
//       renders (collectSources), and the "Sources" heading TextOS's article
//       review places immediately before them — otherwise every Source would
//       be shown twice (CTC-CHAIN-1 notes carry their Sources in the body).
// That's it. No sweep-until-next-H2. No generic "Related" swallow. No
// heuristic hiding of Sources/Author/Revision.
//
// Consumed blocks are DROPPED from body rendering (not hidden). Parity is
// preserved by teaching the render-parity evaluator that consumed blocks are
// projected outside the body, not duplicated.

import type { ResolvedContentSurface } from "../contract/resolved-content-surface";
import { collectBodyLinkHrefs, findSourceRelatedSectionFromResolved } from "./related-source-links";

export interface ManagedSurfacePlan {
  /** Block ids that must NOT be rendered in the body — they are re-projected. */
  consumedBlockIds: ReadonlySet<string>;
  /** Heading block ids that must NOT appear in the ToC. */
  skipHeadingIds: ReadonlySet<string>;
}

export function computeManagedSurfacePlan(
  resolved: ResolvedContentSurface,
  options: {
    /**
     * Hrefs the surface actually re-projects outside the body (Related module, editorial next
     * step). Port of PR #22 onto main : the source section is consumed ONLY when every one of its
     * governed links stays on the page — re-projected, or carried by another body block.
     * Otherwise it stays in the body flow untouched, so no governed link the article carries can
     * disappear from the page (exact-parity guarantee, and this module's own stated intent).
     */
    reprojectedHrefs: ReadonlySet<string>;
  },
): ManagedSurfacePlan {
  const consumed = new Set<string>();
  const skipHeadings = new Set<string>();

  const src = findSourceRelatedSectionFromResolved(resolved);
  const elsewhere = src
    ? collectBodyLinkHrefs(resolved, new Set([src.headingBlockId, src.listBlockId]))
    : new Set<string>();
  if (
    src &&
    src.links.every((l) => options.reprojectedHrefs.has(l.href) || elsewhere.has(l.href))
  ) {
    consumed.add(src.headingBlockId);
    consumed.add(src.listBlockId);
    skipHeadings.add(src.headingBlockId);
  }

  const visible = resolved.blocks.filter((rb) => rb.visible).map((rb) => rb.block);
  const firstSource = visible.findIndex((block) => block.kind === "source");
  if (firstSource >= 0) {
    for (const block of visible) if (block.kind === "source") consumed.add(block.id);
    const before = visible[firstSource - 1];
    if (before && before.kind === "heading" && before.data.text === "Sources") {
      consumed.add(before.id);
      skipHeadings.add(before.id);
    }
  }

  return { consumedBlockIds: consumed, skipHeadingIds: skipHeadings };
}
