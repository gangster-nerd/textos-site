// CMO-SURFACE-VERTICAL-SLICE-1 REVIEW FIX — narrow trailing-section detection.
//
// Only two things are ever consumed from the article body :
//   (a) the "Related …" heading + its immediately following list block, when
//       recognised by related-source-links.ts ;
// That's it. No sweep-until-next-H2. No generic "Related" swallow. No
// heuristic hiding of Sources/Author/Revision.
//
// Consumed blocks are DROPPED from body rendering (not hidden). Parity is
// preserved by teaching the render-parity evaluator that consumed blocks are
// projected outside the body, not duplicated.

import type { ResolvedContentSurface } from "../contract/resolved-content-surface";
import { findSourceRelatedSectionFromResolved } from "./related-source-links";

export interface ManagedSurfacePlan {
  /** Block ids that must NOT be rendered in the body — they are re-projected. */
  consumedBlockIds: ReadonlySet<string>;
  /** Heading block ids that must NOT appear in the ToC. */
  skipHeadingIds: ReadonlySet<string>;
}

export function computeManagedSurfacePlan(
  resolved: ResolvedContentSurface,
): ManagedSurfacePlan {
  const consumed = new Set<string>();
  const skipHeadings = new Set<string>();

  const src = findSourceRelatedSectionFromResolved(resolved);
  if (src) {
    consumed.add(src.headingBlockId);
    consumed.add(src.listBlockId);
    skipHeadings.add(src.headingBlockId);
  }

  return { consumedBlockIds: consumed, skipHeadingIds: skipHeadings };
}
