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
import { renderBlock } from "./block-renderers";
import { assignHeadingIds, phrasingToPlainText } from "./mdast-renderer";
import type { ResolvedReferenceCta } from "../conversion/resolve-reference-cta";
import type { ResolvedRelatedEntry } from "../site-integration/related-resolution";
import { editorialEyebrowLabel } from "../site-integration/editorial-eyebrow";
import { computeReadingTimeMinutes } from "../site-integration/reading-time";
import { computeManagedSurfacePlan } from "../site-integration/managed-surface-plan";
import { findSourceRelatedSectionFromResolved } from "../site-integration/related-source-links";
import {
  deriveResolvedConversionPlan,
  type ResolvedConversionPlan,
} from "../site-integration/conversion-plan";

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
  /**
   * CMO-CONVERSION-SURFACE-2 : governed retention descriptor. When provided
   * and `provider` is configured, the managed surface emits the newsletter
   * capture box before Related. When state is "unconfigured", the box is
   * rendered ONLY in a preview build and cannot submit.
   */
  newsletter?: {
    provider: "buttondown";
    username: string | null;
    sourceTag: string;
    privacyUrl: string | null;
    /** True if this build is an editorial preview (drafts visible). */
    isPreview: boolean;
  };
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
    newsletter,
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

  // CMO-CONVERSION-SURFACE-2 : derived conversion plan (commercial CTA at
  // three placements, editorial next step, retention).
  const newsletterEnabled = Boolean(
    newsletter && (newsletter.isPreview || (newsletter.username && newsletter.privacyUrl)),
  );
  const conversionPlan: ResolvedConversionPlan = deriveResolvedConversionPlan({
    resolved,
    cta,
    sourceRelated: findSourceRelatedSectionFromResolved(resolved),
    computedRelated: (relatedEntries ?? []),
    newsletterEnabled,
  });

  // CMO-SURFACE-VISUAL-CORRECTION-1 : promote the first visible Short Answer
  // block above the ToC so it lives in the first viewport, and consume its
  // body-flow copy so it isn't rendered twice.
  const shortAnswerRb = resolved.blocks.find(
    (rb) => rb.visible && rb.block.kind === "answer",
  );
  const bodyConsumedIds = new Set<string>(plan.consumedBlockIds);
  if (shortAnswerRb) bodyConsumedIds.add(shortAnswerRb.block.id);

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

      {shortAnswerRb ? (
        <div
          className="cse-surface__short-answer"
          data-role="short-answer"
          data-cse-block-id={shortAnswerRb.block.id}
        >
          {renderBlock(shortAnswerRb.block, {
            documentId: resolved.documentId,
            headingIdByNode: new Map(),
          })}
        </div>
      ) : null}

      {conversionPlan.commercial.header ? (
        <div
          className="cse-surface__cta cse-surface__cta--header"
          data-role="commercial-cta"
          data-cse-cta-slot="header"
          data-cse-cta-variant={conversionPlan.commercial.header.variantId}
          data-cse-cta-version={conversionPlan.commercial.header.version}
          data-cse-content-revision={contentRevision}
          data-cse-instrument-event="commercial_cta_impression"
        >
          <a
            className="cse-surface__cta-primary"
            href={conversionPlan.commercial.header.destination}
            data-cse-cta-destination={conversionPlan.commercial.header.destination}
            data-cse-instrument-event="commercial_cta_click"
          >
            {conversionPlan.commercial.header.primaryLabel}
          </a>
          {conversionPlan.commercial.header.secondaryHref ? (
            <a
              className="cse-surface__cta-secondary"
              href={conversionPlan.commercial.header.secondaryHref}
              data-cse-instrument-event="editorial_next_step_click"
            >
              {conversionPlan.commercial.header.secondaryLabel}
            </a>
          ) : null}
        </div>
      ) : null}

      {showToc ? (
        <nav
          className="cse-surface__toc"
          aria-label="Table of contents"
          data-cse-instrument="toc"
        >
          <p className="cse-surface__toc-title">On this page</p>
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
        consumedBlockIds={bodyConsumedIds}
        renderContextualCta={
          conversionPlan.commercial.contextual && ctaContextualHref
            ? () => {
                const c = conversionPlan.commercial.contextual!;
                return (
                  <aside
                    className="cse-surface__cta cse-surface__cta--contextual"
                    data-role="commercial-cta"
                    data-cse-cta-slot="contextual"
                    data-cse-cta-variant={c.variantId}
                    data-cse-cta-version={c.version}
                    data-cse-cta-position="contextual"
                    data-cse-content-revision={contentRevision}
                    data-cse-instrument-event="commercial_cta_impression"
                  >
                    <p className="cse-surface__cta-title">{c.headline}</p>
                    <a
                      className="cse-surface__cta-action"
                      href={ctaContextualHref}
                      data-cse-cta-destination={c.destination}
                      data-cse-instrument-event="commercial_cta_click"
                    >
                      {c.primaryLabel}
                    </a>
                  </aside>
                );
              }
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

      {conversionPlan.commercial.final ? (
        <aside
          className="cse-surface__cta cse-surface__cta--final"
          data-role="commercial-cta"
          data-cse-cta-slot="final"
          data-cse-cta-variant={conversionPlan.commercial.final.variantId}
          data-cse-cta-version={conversionPlan.commercial.final.version}
          data-cse-cta-position="final"
          data-cse-content-revision={contentRevision}
          data-cse-instrument-event="commercial_cta_impression"
        >
          <p className="cse-surface__cta-eyebrow">{conversionPlan.commercial.final.eyebrow}</p>
          <p className="cse-surface__cta-title">{conversionPlan.commercial.final.headline}</p>
          <p className="cse-surface__cta-body">{conversionPlan.commercial.final.copy}</p>
          <a
            className="cse-surface__cta-action cse-surface__cta-primary"
            href={ctaFinalHref ?? conversionPlan.commercial.final.destination}
            data-cse-cta-destination={conversionPlan.commercial.final.destination}
            data-cse-instrument-event="commercial_cta_click"
          >
            {conversionPlan.commercial.final.primaryLabel}
          </a>
          {cta?.disclaimer ? (
            <p className="cse-surface__cta-disclaimer">{cta.disclaimer}</p>
          ) : null}
        </aside>
      ) : null}

      {conversionPlan.editorialNextStep ? (
        <nav
          className="cse-surface__editorial-next-step"
          aria-label="Continue exploring"
          data-role="editorial-next-step"
          data-cse-instrument-event="editorial_next_step_impression"
          data-cse-next-step-source={conversionPlan.editorialNextStep.source}
        >
          <p className="cse-surface__label">Continue exploring</p>
          <a
            className="cse-surface__editorial-next-step-link"
            href={conversionPlan.editorialNextStep.href}
            data-cse-instrument-event="editorial_next_step_click"
          >
            {conversionPlan.editorialNextStep.label}
          </a>
          {conversionPlan.editorialNextStep.description ? (
            <p className="cse-surface__editorial-next-step-description">
              {conversionPlan.editorialNextStep.description}
            </p>
          ) : null}
        </nav>
      ) : null}

      {newsletter && conversionPlan.retention.enabled ? (
        <section
          className="cse-surface__newsletter"
          data-role="newsletter"
          data-cse-instrument-event="newsletter_impression"
          data-provider={newsletter.provider}
          data-provider-state={
            newsletter.username && newsletter.privacyUrl ? "configured" : "unconfigured"
          }
          aria-labelledby={`${resolved.documentId}-newsletter-title`}
        >
          <p
            id={`${resolved.documentId}-newsletter-title`}
            className="cse-surface__newsletter-title"
          >
            The Authority Intelligence Brief
          </p>
          <p className="cse-surface__newsletter-copy">
            One evidence-led note on how brands earn visibility in answer engines. No rankings. No noise.
          </p>
          {newsletter.username && newsletter.privacyUrl ? (
            <form
              className="cse-surface__newsletter-form"
              method="post"
              action={`https://buttondown.com/api/emails/embed-subscribe/${encodeURIComponent(newsletter.username)}`}
              target="popupwindow"
            >
              <label className="cse-surface__newsletter-label" htmlFor={`${resolved.documentId}-newsletter-email`}>
                Work email
              </label>
              <input
                id={`${resolved.documentId}-newsletter-email`}
                type="email"
                name="email"
                autoComplete="email"
                required
                placeholder="Work email"
                className="cse-surface__newsletter-input"
              />
              <input type="hidden" name="tag" value={newsletter.sourceTag} />
              <input type="hidden" name="embed" value="1" />
              <button
                type="submit"
                className="cse-surface__newsletter-submit"
                data-cse-instrument-event="newsletter_submit_attempt"
              >
                Get the brief
              </button>
              <p className="cse-surface__newsletter-consent">
                By subscribing you consent to receive the brief.{" "}
                <a href={newsletter.privacyUrl}>Privacy notice</a>.
              </p>
            </form>
          ) : (
            <>
              {newsletter.isPreview ? (
                <p className="cse-surface__newsletter-preview-label" data-role="newsletter-preview-label">
                  Preview — provider connection required
                </p>
              ) : null}
              <div className="cse-surface__newsletter-form" aria-disabled="true">
                <label className="cse-surface__newsletter-label" htmlFor={`${resolved.documentId}-newsletter-email`}>
                  Work email
                </label>
                <input
                  id={`${resolved.documentId}-newsletter-email`}
                  type="email"
                  placeholder="Work email"
                  disabled
                  className="cse-surface__newsletter-input"
                />
                <button
                  type="button"
                  disabled
                  className="cse-surface__newsletter-submit"
                  aria-disabled="true"
                >
                  Get the brief
                </button>
                <p className="cse-surface__newsletter-consent">
                  Newsletter provider is not configured — no submission possible.
                </p>
              </div>
            </>
          )}
        </section>
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
