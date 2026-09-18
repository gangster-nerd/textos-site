// A2 — TextOS-managed reference surface.
//
// Composes a full page fragment around the generic body renderer, using ONLY signals from
// ResolvedContentSurface and the CSE conversion / relationships / navigation facilities.
// This module intentionally lives beside the generic renderer because its choices are
// TextOS-specific: breadcrumb copy, author-card shape, sources list heuristic. A different
// product would supply a different managed surface.
//
// The managed surface does NOT parse markdown, NOT read files, NOT infer authority.

import React, { type ReactElement, type ReactNode } from "react";

import type { ContentDocument } from "../contract/content-document";
import type { ResolvedContentSurface } from "../contract/resolved-content-surface";
import type { BlockNode, HeadingNode } from "../contract/mdast-semantic";
import { RenderReferenceBody, RENDER_VERSION } from "./reference-renderer";
import { assignHeadingIds, phrasingToPlainText } from "./mdast-renderer";
import type { ResolvedReferenceCta } from "../conversion/resolve-reference-cta";
import type { ResolvedRelatedEntry } from "../site-integration/related-resolution";
import { editorialEyebrowLabel } from "../site-integration/editorial-eyebrow";
import { computeReadingTimeMinutes } from "../site-integration/reading-time";
import { computeManagedSurfacePlan } from "../site-integration/managed-surface-plan";
import { findSourceRelatedSectionFromResolved } from "../site-integration/related-source-links";

const RELATED_MAX = 5;

export interface ManagedSurfaceProps {
  resolved: ResolvedContentSurface;
  cta: ResolvedReferenceCta | null;
  // Optional entity bridge — resolveAuthor returns display info AND profilePath when known.
  resolveAuthor?: (
    id: string,
  ) => { name: string; role?: string; profilePath?: string } | null;
  tocEnabled?: boolean;
  /**
   * Explicit eyebrow label. Callers that pass `document` may omit this — the
   * managed surface then derives the label from doc.truth.sourceStatus via
   * `editorialEyebrowLabel`. Never render SNAKE_CASE.
   */
  kicker?: string;
  /**
   * Optional : full ContentDocument. When provided, the managed surface derives
   * the eyebrow label, reading time and metadata dates itself — no per-slug
   * logic in the route.
   */
  document?: ContentDocument;
  /**
   * A2R : two positions for the CTA. Contextual is rendered INSIDE the body flow at
   * the first source-backed `cta_slot` block. Final is rendered AFTER the body but
   * before related-content.
   */
  ctaContextualHref?: string | null;
  ctaFinalHref?: string | null;
  contentRevision?: string;
  /**
   * Optional : resolved related-content entries. When provided, the managed surface
   * renders titles + descriptions + links (not raw ids).
   */
  relatedEntries?: readonly ResolvedRelatedEntry[];
  /**
   * A2R : includes an "Insights" breadcrumb step between TextOS and the title.
   * When `document` is provided, defaults to true.
   */
  breadcrumbInsights?: boolean;
}

interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

function collectHeadings(
  resolved: ResolvedContentSurface,
  skipHeadingIds: ReadonlySet<string>,
): readonly HeadingItem[] {
  const roots: BlockNode[] = [];
  const rootBlockIdByRoot = new Map<BlockNode, string>();
  const syntheticFallback: HeadingItem[] = [];
  for (const rb of resolved.blocks) {
    if (!rb.visible) continue;
    if (rb.block.kind !== "heading") continue;
    if (skipHeadingIds.has(rb.block.id)) continue;
    const mdast = (rb.block.data as { mdast?: unknown } | undefined)?.mdast;
    if (mdast && typeof mdast === "object") {
      const node = mdast as BlockNode;
      roots.push(node);
      rootBlockIdByRoot.set(node, rb.block.id);
      continue;
    }
    const text = typeof rb.block.data.text === "string" ? rb.block.data.text : "";
    syntheticFallback.push({ id: rb.block.id, text, level: rb.block.level ?? 2 });
  }
  if (roots.length === 0) return syntheticFallback;
  const { order } = assignHeadingIds(roots);
  const mdastItems = order.map((o) => ({ id: o.id, text: o.text, depth: o.depth }));
  const seen = new Set<string>();
  const deduped: HeadingItem[] = [];
  for (const h of mdastItems) {
    if (seen.has(h.id)) continue;
    seen.add(h.id);
    deduped.push({ id: h.id, text: h.text, level: h.depth });
  }
  return [...deduped, ...syntheticFallback];
}

function collectSources(resolved: ResolvedContentSurface): readonly ReactNode[] {
  const items: ReactNode[] = [];
  for (const rb of resolved.blocks) {
    if (!rb.visible) continue;
    if (rb.block.kind !== "source") continue;
    const ref = typeof rb.block.data.ref === "string" ? rb.block.data.ref : "";
    const title = typeof rb.block.data.title === "string" ? rb.block.data.title : ref;
    const href = typeof rb.block.data.href === "string" ? rb.block.data.href : "";
    items.push(
      <li key={rb.block.id}>
        {href ? <a href={href} rel="noopener">{title}</a> : <span>{title}</span>}
      </li>,
    );
  }
  return items;
}

function formatDate(iso: string): string {
  const trimmed = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return iso;
  const d = new Date(trimmed + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return trimmed;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

interface MetadataDateEntry {
  label: "First published" | "Last reviewed";
  iso: string;
  display: string;
}

function computeMetadataDates(doc: ContentDocument | undefined): readonly MetadataDateEntry[] {
  if (!doc) return [];
  const lc = doc.lifecycle;
  const entries: MetadataDateEntry[] = [];
  const firstPublishedAt = lc.firstPublishedAt ?? null;
  const lastReviewedAt = (lc as { lastReviewedAt?: string | null }).lastReviewedAt ?? null;

  // "First published" — iff a real governed firstPublishedAt exists.
  if (firstPublishedAt) {
    entries.push({ label: "First published", iso: firstPublishedAt, display: formatDate(firstPublishedAt) });
  }
  // "Last reviewed" — iff a real governed lastReviewedAt exists. Draft status
  // is not a reason to suppress a real review date ; both fields are truthful,
  // independent signals — never inferred, never fabricated.
  if (lastReviewedAt) {
    entries.push({ label: "Last reviewed", iso: lastReviewedAt, display: formatDate(lastReviewedAt) });
  }
  return entries;
}

export function ManagedTextosSurface(props: ManagedSurfaceProps): ReactElement {
  const {
    resolved,
    cta,
    resolveAuthor,
    tocEnabled = true,
    kicker,
    document,
    ctaContextualHref,
    ctaFinalHref,
    contentRevision,
    relatedEntries,
  } = props;

  const eyebrow = kicker ?? (document ? editorialEyebrowLabel(document) : "");
  const breadcrumbInsights = props.breadcrumbInsights ?? Boolean(document);
  const readingTimeMinutes = computeReadingTimeMinutes(resolved);
  const metadataDates = computeMetadataDates(document);
  const plan = computeManagedSurfacePlan(resolved);
  const sourceRelated = findSourceRelatedSectionFromResolved(resolved);
  const computedRelated = (relatedEntries ?? []).slice(0, RELATED_MAX);
  // Fallback : governed outbound links from the source "Related …" section
  // are surfaced iff the computed graph found no publishable relation. Never
  // inflated to fill space, never mixed to inflate count. Draft targets are
  // filtered upstream by resolveRelatedContent's publicOnly caller.
  const fallbackRelated =
    computedRelated.length === 0 && sourceRelated
      ? sourceRelated.links.slice(0, RELATED_MAX).map((l) => ({
          key: l.href,
          title: l.title || l.href,
          href: l.href,
          description: "",
          source: "governed-body-link" as const,
        }))
      : [];
  const relatedForRender: readonly {
    key: string;
    title: string;
    href: string;
    description: string;
    source: "computed" | "governed-body-link";
    documentId?: string;
    slug?: string;
  }[] =
    computedRelated.length > 0
      ? computedRelated.map((r) => ({
          key: r.documentId,
          title: r.title,
          href: r.href,
          description: r.description,
          source: "computed" as const,
          documentId: r.documentId,
          slug: r.slug,
        }))
      : fallbackRelated;

  const headings = collectHeadings(resolved, plan.skipHeadingIds);
  const showToc =
    tocEnabled && resolved.navigation.showTableOfContents && headings.length >= 3;
  const sources = collectSources(resolved);
  const authors = resolved.authorship.showAuthor
    ? resolved.authorship.authorIds
        .map((id) => ({ id, person: resolveAuthor?.(id) ?? null }))
        .filter((a) => a.person !== null)
    : [];

  return (
    <article
      className="cse-surface cse-surface--textos"
      lang={resolved.language}
      data-cse-surface-policy={resolved.policyId}
      data-cse-render-version={RENDER_VERSION}
      data-cse-content-id={resolved.documentId}
    >
      {resolved.navigation.showBreadcrumbs ? (
        <nav
          className="cse-surface__breadcrumbs"
          aria-label="Breadcrumb"
          data-role="breadcrumb"
        >
          <ol role="list">
            <li>
              <a href="/">TextOS</a>
              <span aria-hidden="true" className="cse-surface__breadcrumb-sep">/</span>
            </li>
            {breadcrumbInsights ? (
              <li>
                <a href="/insights">Insights</a>
                <span aria-hidden="true" className="cse-surface__breadcrumb-sep">/</span>
              </li>
            ) : null}
            <li aria-current="page">{resolved.title}</li>
          </ol>
        </nav>
      ) : null}

      <header className="cse-surface__head">
        {eyebrow ? (
          <p
            className="cse-surface__eyebrow"
            data-role="editorial-eyebrow"
          >
            {eyebrow}
          </p>
        ) : null}
        <h1 className="cse-surface__title">{resolved.title}</h1>
        <p className="cse-surface__description">{resolved.description}</p>
        {authors.length > 0 ? (
          <p className="cse-surface__byline">
            <span className="cse-surface__label">By</span>{" "}
            {authors.map((a, i) => {
              const profilePath = (a.person as { profilePath?: string } | null)
                ?.profilePath;
              return (
                <span key={a.id}>
                  {i > 0 ? ", " : ""}
                  {profilePath ? (
                    <a
                      className="cse-surface__author-link"
                      href={profilePath}
                      data-cse-author-id={a.id}
                    >
                      {a.person?.name}
                    </a>
                  ) : (
                    <span data-cse-author-id={a.id}>{a.person?.name}</span>
                  )}
                  {a.person?.role ? (
                    <span className="cse-surface__role"> ({a.person.role})</span>
                  ) : null}
                </span>
              );
            })}
          </p>
        ) : null}
        <p
          className="cse-surface__meta"
          data-role="article-meta"
          aria-label="Article metadata"
        >
          <span className="cse-surface__meta-item" data-role="reading-time">
            {readingTimeMinutes} min read
          </span>
          {metadataDates.map((entry) => (
            <span
              key={entry.label}
              className="cse-surface__meta-item"
              data-role={`meta-${entry.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <span className="cse-surface__meta-label">{entry.label}</span>{" "}
              <time dateTime={entry.iso}>{entry.display}</time>
            </span>
          ))}
        </p>
      </header>

      {showToc ? (
        <nav
          className="cse-surface__toc"
          aria-label="Table of contents"
          data-cse-instrument="toc"
        >
          <p className="cse-surface__label">On this page</p>
          <ol>
            {headings.map((h) => (
              <li key={h.id} className={`cse-surface__toc-level-${h.level}`}>
                <a href={`#${h.id}`}>{h.text}</a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <RenderReferenceBody
        resolved={resolved}
        consumedBlockIds={plan.consumedBlockIds}
        renderContextualCta={
          cta && ctaContextualHref
            ? () => (
                <aside
                  className="cse-surface__cta cse-surface__cta--contextual"
                  data-cse-cta-variant={cta.variantId}
                  data-cse-cta-version={cta.version}
                  data-cse-cta-position="contextual"
                  data-cse-content-revision={contentRevision}
                >
                  <p className="cse-surface__cta-title">{cta.title}</p>
                  <p className="cse-surface__cta-body">{cta.body}</p>
                  <a
                    className="cse-surface__cta-action"
                    href={ctaContextualHref}
                    data-cse-cta-destination={cta.destination}
                  >
                    {cta.primaryLabel}
                  </a>
                </aside>
              )
            : undefined
        }
      />

      {sources.length > 0 ? (
        <section className="cse-surface__sources" aria-labelledby={`${resolved.documentId}-sources`}>
          <h2 id={`${resolved.documentId}-sources`} className="cse-surface__label">
            Sources
          </h2>
          <ul>{sources}</ul>
        </section>
      ) : null}

      {/* A2R : final CTA emitted AFTER body (and after any contextual CTA in body). */}
      {resolved.conversion.effectiveCtaAllowed && cta ? (
        <aside
          className="cse-surface__cta cse-surface__cta--final"
          data-cse-cta-variant={cta.variantId}
          data-cse-cta-version={cta.version}
          data-cse-cta-position="final"
          data-cse-content-revision={contentRevision}
        >
          <p className="cse-surface__cta-title">{cta.title}</p>
          <p className="cse-surface__cta-body">{cta.body}</p>
          <a
            className="cse-surface__cta-action"
            href={ctaFinalHref ?? cta.destination}
            data-cse-cta-destination={cta.destination}
          >
            {cta.primaryLabel}
          </a>
          {cta.disclaimer ? (
            <p className="cse-surface__cta-disclaimer">{cta.disclaimer}</p>
          ) : null}
        </aside>
      ) : null}

      {/* CMO-SURFACE-VERTICAL-SLICE-1 REVIEW FIX : single Related module. No
          draft badges. Computed relations preferred ; governed body-link
          fallback (from a consumed "Related …" section) is used only when
          the graph has no publishable result. Section is hidden entirely if
          neither source has admissible entries. */}
      {resolved.navigation.showRelatedContent && relatedForRender.length > 0 ? (
        <nav
          className="cse-surface__related"
          aria-label="Related"
          data-role="related"
          data-cse-related-source={
            relatedForRender[0]?.source === "governed-body-link"
              ? "governed-body-link"
              : "computed"
          }
        >
          <p className="cse-surface__label">Related</p>
          <ul>
            {relatedForRender.map((r) => (
              <li
                key={r.key}
                {...(r.documentId ? { "data-cse-related-id": r.documentId } : {})}
              >
                <a
                  href={r.href}
                  {...(r.slug ? { "data-cse-related-slug": r.slug } : {})}
                >
                  {r.title}
                </a>
                {r.description ? (
                  <p className="cse-surface__related-description">{r.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </article>
  );
}
