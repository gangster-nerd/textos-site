// COMPOSER — pure composition.
//
// resolveContentSurface(document, policy) → ResolvedContentSurface.
//
// The function is pure and deterministic. It does not read files, invoke network, parse HTML,
// or import React / Next.js / any CMS. It never mutates its inputs. It never infers editorial
// truth: allowedSurfaces gates the surface, publicationStatus gates visibility, sourceStatus
// remains opaque throughout. If a policy contradicts editorial truth, editorial truth wins.

import type {
  BlockKind,
  ContentBlock,
  ContentDocument,
  SurfaceKind,
} from "../contract/content-document";
import type { SurfacePolicy } from "../contract/surface-policy";
import type {
  ResolvedBlock,
  ResolvedContentSurface,
} from "../contract/resolved-content-surface";
import { RESOLVED_SURFACE_VERSION } from "../contract/resolved-content-surface";
import { resolveSourceAuthority } from "./provenance-authority";

export class SurfaceNotAllowedError extends Error {
  readonly documentId: string;
  readonly surface: SurfaceKind;
  constructor(documentId: string, surface: SurfaceKind) {
    super(
      `document "${documentId}" does not allow surface "${surface}" (allowedSurfaces gate).`,
    );
    this.name = "SurfaceNotAllowedError";
    this.documentId = documentId;
    this.surface = surface;
  }
}

export class UncertifiedProvenanceError extends Error {
  readonly documentId: string;
  readonly sourceSha: string;
  constructor(documentId: string, sourceSha: string) {
    super(
      `document "${documentId}" carries sourceSha ${sourceSha}, which is not present in ` +
        `content/certified-lineage.json (fail-closed).`,
    );
    this.name = "UncertifiedProvenanceError";
    this.documentId = documentId;
    this.sourceSha = sourceSha;
  }
}

function resolveBlocks(
  document: ContentDocument,
  policy: SurfacePolicy,
): ResolvedBlock[] {
  const visibility = new Map<BlockKind, "show" | "hide">();
  for (const rule of policy.blockVisibility) {
    visibility.set(rule.kind, rule.action);
  }
  const slotToRegion = new Map<string, string>();
  for (const binding of policy.slotBindings) {
    slotToRegion.set(binding.slot, binding.region);
  }
  return document.body.map((block: ContentBlock, index: number): ResolvedBlock => {
    const rule = visibility.get(block.kind);
    let visible = true;
    let hiddenReason: string | null = null;
    if (rule === "hide") {
      visible = false;
      hiddenReason = `policy:${policy.policyId} hides kind=${block.kind}`;
    }
    const region = block.slot ? slotToRegion.get(block.slot) ?? null : null;
    return { block, order: index, region, visible, hiddenReason };
  });
}

function compositionSignature(
  document: ContentDocument,
  policy: SurfacePolicy,
  resolvedBlocks: readonly ResolvedBlock[],
): string {
  // Deterministic, non-cryptographic composition signature. Depends only on the identity of
  // the inputs and the composition outcome. Never depends on wall-clock time.
  const parts = [
    document.contentSchemaVersion,
    document.identity.documentId,
    document.identity.slug,
    document.truth.publicationStatus,
    document.truth.allowedSurfaces.slice().sort().join(","),
    policy.policyVersion,
    policy.policyId,
    policy.surface,
    resolvedBlocks
      .map((b) => `${b.order}:${b.block.id}:${b.visible ? "v" : "h"}`)
      .join("|"),
  ];
  return parts.join("::");
}

export function resolveContentSurface(
  document: ContentDocument,
  policy: SurfacePolicy,
): ResolvedContentSurface {
  // 1. allowedSurfaces gate — the normalized boundary. sourceStatus is not consulted.
  if (!document.truth.allowedSurfaces.includes(policy.surface)) {
    throw new SurfaceNotAllowedError(document.identity.documentId, policy.surface);
  }

  // 2. Provenance fail-closed. A declared sourceSha that is not in certified-lineage.json
  //    cannot silently pass through as UNCERTIFIED — that would erase the fact that the
  //    document CLAIMED a lineage the site does not certify.
  const authority = resolveSourceAuthority(
    document.provenance.sourceSha
      ? { sourceSha: document.provenance.sourceSha }
      : { sourceSha: undefined },
  );
  if (authority.reason === "unknown-source-sha") {
    throw new UncertifiedProvenanceError(
      document.identity.documentId,
      document.provenance.sourceSha as string,
    );
  }

  // 3. Blocks.
  const resolvedBlocks = resolveBlocks(document, policy);
  const visibleBlockKinds = Array.from(
    new Set(resolvedBlocks.filter((b) => b.visible).map((b) => b.block.kind)),
  );

  // 4. Indexability: policy may only DOWNGRADE.
  const editorialIntent = document.seo.indexingIntent;
  const policyAllowsIndex = policy.indexability.allowIndex;
  const effectiveIndexing: "index" | "noindex" =
    editorialIntent === "index" && policyAllowsIndex ? "index" : "noindex";
  const indexingDowngraded = editorialIntent === "index" && !policyAllowsIndex;

  // 5. Conversion: policy may only DENY. It cannot force a CTA the document forbids.
  const documentAllowsCta = document.conversion.conversionAllowed;
  const policyAllowsCta = policy.conversion.allowCta;
  const effectiveCtaAllowed = documentAllowsCta && policyAllowsCta;
  let ctaSuppressedReason: string | null = null;
  if (!documentAllowsCta) ctaSuppressedReason = "document.conversionAllowed=false";
  else if (!policyAllowsCta) ctaSuppressedReason = `policy:${policy.policyId} disallows cta`;

  const resolved: ResolvedContentSurface = {
    resolvedSchemaVersion: RESOLVED_SURFACE_VERSION,
    contentSchemaVersion: document.contentSchemaVersion,
    policyId: policy.policyId,
    policyVersion: policy.policyVersion,
    surface: policy.surface,

    documentId: document.identity.documentId,
    contentType: document.identity.contentType,
    slug: document.identity.slug,
    language: document.identity.language,
    title: document.identity.title,
    description: document.identity.description,

    visibleBlockKinds,
    blocks: resolvedBlocks,

    truth: {
      publicationStatus: document.truth.publicationStatus,
      allowedSurfaces: document.truth.allowedSurfaces,
      sourceAuthority:
        authority.authority === "UNCERTIFIED"
          ? "UNCERTIFIED"
          : authority.authority,
    },
    authorship: {
      showAuthor: policy.authorDisplay.showAuthor,
      showReviewers: policy.authorDisplay.showReviewers,
      authorIds: document.editorial.authorIds,
      reviewerIds: document.editorial.reviewerIds,
    },
    conversion: {
      effectiveCtaAllowed,
      ctaIntentId: document.conversion.ctaIntentId ?? null,
      ctaSuppressedReason,
    },
    navigation: {
      showBreadcrumbs: policy.navigation.showBreadcrumbs,
      showTableOfContents: policy.navigation.showTableOfContents,
      showRelatedContent: policy.navigation.showRelatedContent,
      relatedContentIds: document.relationships.relatedContentIds,
    },
    metadata: {
      emitSchemaOrg: policy.metadata.emitSchemaOrg,
      schemaType: policy.metadata.schemaTypeOverride ?? document.seo.schemaType ?? null,
      effectiveIndexing,
      indexingDowngraded,
      canonicalPath: document.seo.canonicalPath ?? null,
      analyticsSurfaceTag: policy.analytics.surfaceTag ?? null,
    },
    compositionSignature: "",
  };
  resolved.compositionSignature = compositionSignature(document, policy, resolvedBlocks);
  return resolved;
}
