import { load } from "cheerio";
import type { ProductionInsight } from "./delivery-certification";

export interface HttpObservation {
  url: string; status: number; location: string | null;
  headers: Record<string, string>; body: string;
}
export interface PrivateInsight extends ProductionInsight { passages: string[] }
const normalize = (text: string) => text.replace(/\s+/g, " ").trim();

/** Provenance comes from read-only Vercel/GitHub records, not a caller's URL label. */
export function verifyStagedDeployment(sha: string, deployment: Record<string, unknown>,
  gitDeployment: Record<string, unknown>, statuses: readonly Record<string, unknown>[]) {
  const origin = `https://${deployment.url}`;
  if (deployment.name !== "textos-site" || deployment.contextName !== "marcprp-5751s-projects"
    || deployment.target !== "production" || deployment.readyState !== "READY"
    || !Array.isArray(deployment.aliases) || deployment.aliases.length
    || !/^https:\/\/textos-site-[a-z0-9]+-marcprp-5751s-projects\.vercel\.app$/.test(origin)
    || !/^dpl_/.test(String(deployment.id ?? "")) || gitDeployment.sha !== sha || gitDeployment.environment !== "Production"
    || gitDeployment.repository_url !== "https://api.github.com/repos/gangster-nerd/textos-site"
    || statuses[0]?.state !== "success" || statuses[0]?.environment_url !== origin
    || statuses[0]?.deployment_url !== `https://api.github.com/repos/gangster-nerd/textos-site/deployments/${gitDeployment.id}`)
    throw new Error("HTTP reception requires verified Git provenance and a READY Production deployment with NO assigned aliases");
  return origin;
}

/** Evaluate actual GET responses. Neither HTML digests nor Next .meta prove HTTP status. */
export function verifyHttpResponse(response: HttpObservation, route: string, entries: readonly PrivateInsight[]) {
  const $ = load(response.body);
  const text = normalize($("body").text());
  for (const e of entries.filter(e => e.status !== "published")) {
    if (response.body.includes(e.documentId) || text.includes(e.title)
      || e.passages.some(p => text.includes(normalize(p)))) throw new Error(`DRAFT_EXPOSURE_CONFIRMED:${e.slug}`);
  }
  if (response.location || (response.status >= 300 && response.status < 400)) throw new Error(`http_redirect_refused:${route}`);
  const expected = route === "/insights" ? 200 : 404;
  if (response.status !== expected) throw new Error(`http_status:${route}:expected_${expected}:got_${response.status}`);
  const robots = [response.headers["x-robots-tag"] ?? "", ...$("meta[name='robots' i]").toArray().map(e => $(e).attr("content") ?? "")]
    .join(",").toLowerCase().split(/[,\s]+/);
  if (route === "/insights") {
    if (entries.every(e => e.status !== "published")) {
      if (!text.includes("No articles are currently published in this section.")
        || $("main a[href^='/insights/']").length || text.includes("Every article")) throw new Error("http_empty_insights_invalid");
    }
  } else if (!robots.includes("noindex") || robots.includes("index")
    || $("article,script[type='application/ld+json' i]").length) throw new Error(`http_error_page_invalid:${route}`);
  return { route, status: response.status, robots, privateContent: false, redirected: false };
}

export function receptionRoutes(entries: readonly ProductionInsight[]) {
  return ["/insights", ...["__empty_insights__", "reception-nonexistent-20261121",
    ...entries.filter(e => e.status !== "published").map(e => e.slug)]
    .flatMap(slug => ["", ".html", ".txt", ".rsc"].map(ext => `/insights/${slug}${ext}`))];
}

export async function receiveHttp(origin: string, entries: readonly PrivateInsight[],
  get: (url: string) => Promise<HttpObservation>, record: (r: HttpObservation) => void) {
  const results = [];
  for (const route of receptionRoutes(entries)) {
    const response = await get(origin + route);
    record(response); // Preserve failing bytes before stopping, never continue after a leak.
    results.push(verifyHttpResponse(response, route, entries));
  }
  return results;
}
