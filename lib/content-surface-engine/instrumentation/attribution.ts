// CSE-2 — attribution touch persistence.
//
// A ProductCTA click generates an OPAQUE, high-entropy `attributionId` on the site (never
// derived from contentId, slug, targetQuery, cluster, or user identity). The site persists a
// server-side `AttributionTouch` record and appends only `aid=<attributionId>` to the
// destination URL alongside already-authorized routing params (e.g. `intent`, `source`).
//
// Product-side handling of `aid` is OUT of this mission.
//
// The persistence backend is intentionally trivial (in-memory Map) and can be swapped by a
// consumer providing a `TouchStore`. The mission requires the seam, not a database.

import { randomBytes } from "node:crypto";

export interface AttributionTouch {
  attributionId: string;
  contentId: string;
  contentRevision: string;
  surfacePolicyVersion: string;
  ctaVariant: string;
  ctaVersion: number;
  position: string;
  createdAt: string;
}

export interface TouchStore {
  save(touch: AttributionTouch): Promise<void>;
  get(attributionId: string): Promise<AttributionTouch | undefined>;
}

export function createInMemoryTouchStore(): TouchStore {
  const map = new Map<string, AttributionTouch>();
  return {
    async save(touch) {
      map.set(touch.attributionId, touch);
    },
    async get(id) {
      return map.get(id);
    },
  };
}

/**
 * Generate an opaque, high-entropy attribution id. Uses 128 random bits base64url-encoded.
 * The id carries NO information about the document, brand, or user.
 */
export function newAttributionId(): string {
  return randomBytes(16).toString("base64url");
}

export interface RecordTouchInput {
  contentId: string;
  contentRevision: string;
  surfacePolicyVersion: string;
  ctaVariant: string;
  ctaVersion: number;
  position: string;
  store: TouchStore;
  now?: () => Date;
  attributionId?: string;
}

/**
 * Persist an AttributionTouch server-side and return the opaque id. Consumers should append
 * only `aid=<returned id>` to the product URL — never anything else derived from content
 * identity.
 */
export async function recordAttributionTouch(input: RecordTouchInput): Promise<string> {
  const attributionId = input.attributionId ?? newAttributionId();
  const createdAt = (input.now?.() ?? new Date()).toISOString();
  await input.store.save({
    attributionId,
    contentId: input.contentId,
    contentRevision: input.contentRevision,
    surfacePolicyVersion: input.surfacePolicyVersion,
    ctaVariant: input.ctaVariant,
    ctaVersion: input.ctaVersion,
    position: input.position,
    createdAt,
  });
  return attributionId;
}

/**
 * Append `aid=<id>` to a URL alongside the already-authorized query params passed in
 * `extraParams`. Never appends any content identity or PII: the caller must ensure
 * `extraParams` contains only authorized routing keys (typically `intent`, `source`).
 */
export function buildAttributedUrl(
  destination: string,
  attributionId: string,
  extraParams?: Record<string, string>,
): string {
  // The destination may be an internal path; construct a URL relative to a placeholder base.
  const isAbsolute = /^[a-z]+:\/\//i.test(destination);
  const base = "http://cse.internal";
  const url = new URL(destination, base);
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) {
      // Defensive: refuse identity-bearing keys even if the caller misuses the API.
      if (["contentId", "content_id", "slug", "target_query", "email", "user"].includes(k)) {
        continue;
      }
      url.searchParams.set(k, v);
    }
  }
  url.searchParams.set("aid", attributionId);
  const result = isAbsolute ? url.toString() : url.pathname + url.search + url.hash;
  return result;
}
