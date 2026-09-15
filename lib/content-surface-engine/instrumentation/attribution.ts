// A2 — attribution touch persistence.
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

// Strict allowlist. Any caller-supplied query parameter not in this set is rejected —
// unknown = rejected. `aid` is added by the helper itself and is not caller-supplied. If v2
// needs a new routing key, add it here (as a governed decision) rather than teaching the
// helper about PII exclusions.
export const ATTRIBUTION_CALLER_ALLOWED_PARAMS = ["intent", "source"] as const;
export type AttributionCallerAllowedParam =
  (typeof ATTRIBUTION_CALLER_ALLOWED_PARAMS)[number];

/**
 * Append `aid=<id>` to a URL alongside the STRICT ALLOWLIST of caller-supplied routing
 * parameters (`intent`, `source`). Every other parameter is dropped — including keys the
 * helper has never seen. This is a positive-authorization design: unknown = rejected, so we
 * do not have to enumerate every PII/identity-bearing key we want to block.
 */
export function buildAttributedUrl(
  destination: string,
  attributionId: string,
  extraParams?: Record<string, string>,
): string {
  const isAbsolute = /^[a-z]+:\/\//i.test(destination);
  const base = "http://cse.internal";
  const url = new URL(destination, base);
  if (extraParams) {
    const allowed = new Set<string>(ATTRIBUTION_CALLER_ALLOWED_PARAMS);
    for (const [k, v] of Object.entries(extraParams)) {
      if (!allowed.has(k)) continue; // strict allowlist — unknown key = dropped
      url.searchParams.set(k, v);
    }
  }
  url.searchParams.set("aid", attributionId);
  const result = isAbsolute ? url.toString() : url.pathname + url.search + url.hash;
  return result;
}
