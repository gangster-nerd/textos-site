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
import { RenderReferenceBody } from "./reference-renderer";
import type { ResolvedReferenceCta } from "../conversion/resolve-reference-cta";

export interface ManagedSurfaceProps {
  resolved: ResolvedContentSurface;
  cta: ResolvedReferenceCta | null;
  // Optional author display bridge — the managed surface knows how to place the card, the
  // caller supplies the names.
  resolveAuthor?: (id: string) => { name: string; role?: string } | null;
  // Optional headings for a rudimentary TOC. Derived from the resolved surface (visible
  // heading blocks). The managed surface applies its own threshold.
  tocEnabled?: boolean;
  // Kicker text above the title (e.g. content-type badge). TextOS-editorial.
  kicker?: string;
  // Optional attribution URL (contains only aid=…). Substitutes the raw destination on the
  // CTA. When absent the CTA points to `cta.destination` unchanged.
  ctaAttributedHref?: string | null;
  // Optional content revision passed through as a data attribute for the AttributionTouch
  // pipeline on the client. Never derived from content identity.
  contentRevision?: string;
}

interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

function collectHeadings(resolved: ResolvedContentSurface): readonly HeadingItem[] {
  const out: HeadingItem[] = [];
  for (const rb of resolved.blocks) {
    if (!rb.visible) continue;
    if (rb.block.kind !== "heading") continue;
    const text = typeof rb.block.data.text === "string" ? rb.block.data.text : "";
    out.push({ id: rb.block.id, text, level: rb.block.level ?? 2 });
  }
  return out;
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
    ctaAttributedHref,
    contentRevision,
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
            {authors.map((a, i) => (
              <span key={a.id}>
                {i > 0 ? ", " : ""}
                {a.person?.name}
                {a.person?.role ? <span className="cse-surface__role"> ({a.person.role})</span> : null}
              </span>
            ))}
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

      <RenderReferenceBody resolved={resolved} />

      {sources.length > 0 ? (
        <section className="cse-surface__sources" aria-labelledby={`${resolved.documentId}-sources`}>
          <h2 id={`${resolved.documentId}-sources`} className="cse-surface__label">
            Sources
          </h2>
          <ul>{sources}</ul>
        </section>
      ) : null}

      {resolved.conversion.effectiveCtaAllowed && cta ? (
        <aside
          className="cse-surface__cta"
          data-cse-cta-variant={cta.variantId}
          data-cse-cta-version={cta.version}
          data-cse-cta-position="foot"
          data-cse-content-revision={contentRevision}
        >
          <p className="cse-surface__cta-title">{cta.title}</p>
          <p className="cse-surface__cta-body">{cta.body}</p>
          <a
            className="cse-surface__cta-action"
            href={ctaAttributedHref ?? cta.destination}
            data-cse-cta-destination={cta.destination}
          >
            {cta.primaryLabel}
          </a>
          {cta.disclaimer ? (
            <p className="cse-surface__cta-disclaimer">{cta.disclaimer}</p>
          ) : null}
        </aside>
      ) : null}

      {resolved.navigation.showRelatedContent
        && resolved.navigation.relatedContentIds.length > 0 ? (
        <nav className="cse-surface__related" aria-label="Related">
          <p className="cse-surface__label">Related</p>
          <ul>
            {resolved.navigation.relatedContentIds.map((id) => (
              <li key={id} data-cse-related-id={id}>
                {id}
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </article>
  );
}
