// COMPOSER — ResolvedContentSurface v1.
//
// Derived read model produced by resolveContentSurface(). Never a second authoring source:
// every field here is a function of (ContentDocument, SurfacePolicy). Consumers (renderers,
// NativeAdapter) read it; producers do not write it.

import type { BlockKind, ContentBlock, SurfaceKind } from "./content-document";

export const RESOLVED_SURFACE_VERSION = "resolved-content-surface@1" as const;

export interface ResolvedBlock {
  block: ContentBlock;
  order: number;
  region: string | null;
  visible: boolean;
  hiddenReason: string | null;
}

export interface ResolvedMetadata {
  emitSchemaOrg: boolean;
  schemaType: string | null;
  effectiveIndexing: "index" | "noindex";
  indexingDowngraded: boolean;
  canonicalPath: string | null;
  analyticsSurfaceTag: string | null;
}

export interface ResolvedAuthorship {
  showAuthor: boolean;
  showReviewers: boolean;
  authorIds: readonly string[];
  reviewerIds: readonly string[];
}

export interface ResolvedConversion {
  effectiveCtaAllowed: boolean;
  ctaIntentId: string | null;
  ctaSuppressedReason: string | null;
}

export interface ResolvedNavigation {
  showBreadcrumbs: boolean;
  showTableOfContents: boolean;
  showRelatedContent: boolean;
  relatedContentIds: readonly string[];
}

export interface ResolvedTruth {
  publicationStatus: string;
  allowedSurfaces: readonly SurfaceKind[];
  sourceAuthority: "CERTIFIED_MAIN" | "CERTIFIED_CANDIDATE" | "UNCERTIFIED";
}

export interface ResolvedContentSurface {
  resolvedSchemaVersion: typeof RESOLVED_SURFACE_VERSION;
  contentSchemaVersion: string;
  policyId: string;
  policyVersion: string;
  surface: SurfaceKind;

  documentId: string;
  contentType: string;
  slug: string;
  language: string;
  title: string;
  description: string;

  visibleBlockKinds: readonly BlockKind[];
  blocks: readonly ResolvedBlock[];

  truth: ResolvedTruth;
  authorship: ResolvedAuthorship;
  conversion: ResolvedConversion;
  navigation: ResolvedNavigation;
  metadata: ResolvedMetadata;

  // Composition receipt: the resolver never asserts editorial `updatedAt` here. This field
  // exists so a consumer can invalidate a rendered cache independently of editorial dates.
  compositionSignature: string;
}
