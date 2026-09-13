// CSE-2 — REFERENCE-side instrumentation events.
//
// A small, first-party event stream. When live, events go to an ingestion endpoint
// (POST /api/events, JSON body). When not live, the emitter is a deterministic no-op — same
// signature, same return type, zero I/O — so tests and static builds behave identically.
//
// No external analytics providers are added by CSE-2.

export type CseEvent =
  | { type: "content_viewed"; contentId: string; policyId: string; renderVersion: string }
  | { type: "short_answer_viewed"; contentId: string }
  | { type: "toc_used"; contentId: string; anchor: string }
  | { type: "internal_link_clicked"; contentId: string; to: string }
  | {
      type: "cta_viewed";
      contentId: string;
      ctaVariant: string;
      ctaVersion: number;
      position: string;
    }
  | {
      type: "cta_clicked";
      contentId: string;
      ctaVariant: string;
      ctaVersion: number;
      position: string;
      attributionId: string;
    };

export type EmitterMode = "live" | "demo" | "off";

export interface EmitterConfig {
  mode: EmitterMode;
  endpoint: string; // POST target when live
  fetchImpl?: typeof fetch;
}

export function createEmitter(config: EmitterConfig) {
  return async function emit(event: CseEvent): Promise<void> {
    if (config.mode !== "live") return; // deterministic no-op
    const impl = config.fetchImpl ?? fetch;
    try {
      await impl(config.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(event),
        keepalive: true,
      });
    } catch {
      // Instrumentation failures never surface to the reader.
    }
  };
}
