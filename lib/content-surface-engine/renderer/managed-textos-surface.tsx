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

import type { ResolvedContentSurface } from "../contract/resolved-content-surface";
import type { BlockNode, HeadingNode } from "../contract/mdast-semantic";
import { RenderReferenceBody } from "./reference-renderer";
import { assignHeadingIds, phrasingToPlainText } from "./mdast-renderer";
import type { ResolvedReferenceCta } from "../conversion/resolve-reference-cta";
import type { ResolvedRelatedEntry } from "../site-integration/related-resolution";

export interface ManagedSurfaceProps {
  resolved: ResolvedContentSurface;
  cta: ResolvedReferenceCta | null;
  // Optional entity bridge — resolveAuthor returns display info AND profilePath when known.
  resolveAuthor?: (
    id: string,
  ) => { name: string; role?: string; profilePath?: string } | null;
  tocEnabled?: boolean;
  kicker?: string;
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
   */
  breadcrumbInsights?: boolean;
}

interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

function collectHeadings(resolved: ResolvedContentSurface): readonly HeadingItem[] {
  // A2R : the ToC MUST use the SAME id derivation as the body renderer. Extract
  // ids from source-backed mdast headings via `assignHeadingIds` (shared with
  // reference-renderer). Synthetic headings (A2 fixtures) fall back to the block
  // id + synthetic text.
  const roots: BlockNode[] = [];
  const syntheticFallback: HeadingItem[] = [];
  for (const rb of resolved.blocks) {
    if (!rb.visible) continue;
    if (rb.block.kind !== "heading") continue;
    const mdast = (rb.block.data as { mdast?: unknown } | undefined)?.mdast;
    if (mdast && typeof mdast === "object") {
      roots.push(mdast as BlockNode);
      continue;
    }
    const text = typeof rb.block.data.text === "string" ? rb.block.data.text : "";
    syntheticFallback.push({ id: rb.block.id, text, level: rb.block.level ?? 2 });
  }
  if (roots.length === 0) return syntheticFallback;
  const { order } = assignHeadingIds(roots);
  const mdastItems = order.map((o) => ({ id: o.id, text: o.text, depth: o.depth }));
  return [
    ...mdastItems.map((h) => ({ id: h.id, text: h.text, level: h.depth })),
    ...syntheticFallback,
  ];
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

export function ManagedTextosSurface(props: ManagedSurfaceProps): ReactElement {
  const {
    resolved,
    cta,
    resolveAuthor,
    tocEnabled = true,
    kicker,
    ctaContextualHref,
    ctaFinalHref,
    contentRevision,
    relatedEntries,
    breadcrumbInsights = false,
  } = props;

  const headings = collectHeadings(resolved);
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
      data-cse-render-version="reference@1"
      data-cse-content-id={resolved.documentId}
    >
      {resolved.navigation.showBreadcrumbs ? (
        <nav className="cse-surface__breadcrumbs" aria-label="Breadcrumb">
          <ol>
            <li>
              <a href="/">TextOS</a>
            </li>
            {breadcrumbInsights ? (
              <li>
                <a href="/insights">Insights</a>
              </li>
            ) : null}
            <li aria-current="page">{resolved.title}</li>
          </ol>
        </nav>
      ) : null}

      <header className="cse-surface__head">
        {kicker ? <p className="cse-surface__kicker">{kicker}</p> : null}
        <h1 className="cse-surface__title">{resolved.title}</h1>
        <p className="cse-surface__description">{resolved.description}</p>
        {resolved.truth.publicationStatus !== "published" ? (
          <p className="cse-surface__status" role="note">
            <span className="cse-surface__label">Status</span>{" "}
            {resolved.truth.publicationStatus}
          </p>
        ) : null}
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

      {/* A2R : related entries — resolved titles + descriptions + hrefs. Never raw ids. */}
      {resolved.navigation.showRelatedContent && relatedEntries && relatedEntries.length > 0 ? (
        <nav className="cse-surface__related" aria-label="Related">
          <p className="cse-surface__label">Related</p>
          <ul>
            {relatedEntries.map((r) => (
              <li key={r.documentId} data-cse-related-id={r.documentId}>
                <a href={r.href} data-cse-related-slug={r.slug}>
                  {r.title}
                </a>
                <p className="cse-surface__related-description">{r.description}</p>
                {r.isDraft ? (
                  <span
                    className="cse-surface__related-draft-badge"
                    data-role="related-draft-badge"
                  >
                    draft
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </article>
  );
}
