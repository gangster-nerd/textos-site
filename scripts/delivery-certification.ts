import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { load } from "cheerio";

export type DeliveryMode = "editorial" | "production";
export type Conversion = "off" | "demo";
export interface SourceIdentity { sha: string; tree: string }
export interface ModeReceipt extends SourceIdentity {
  mode: DeliveryMode;
  conversion: Conversion;
  workspace: string;
  fresh: boolean;
  environment: { vercelEnv: string; preview: boolean };
  steps: { name: string; exit: number }[];
}

export function deliveryEnvironment(base: NodeJS.ProcessEnv, mode: DeliveryMode, conversion: Conversion): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...base, ...(mode === "production" ? { NODE_ENV: "production" as const } : {}),
    CONVERSION_MODE: conversion, NEXT_TELEMETRY_DISABLED: "1" };
  delete env.CONTENT_PREVIEW_MODE;
  env.VERCEL_ENV = mode === "production" ? "production" : "preview";
  if (mode === "editorial") env.CONTENT_PREVIEW_MODE = "true";
  return env;
}

/** A green editorial run alone can never certify delivery. */
export function assessDelivery(source: SourceIdentity, conversions: readonly Conversion[], receipts: readonly ModeReceipt[]) {
  const failures: string[] = [];
  if (!/^[a-f0-9]{40}$/.test(source.sha) || !/^[a-f0-9]{40}$/.test(source.tree)) failures.push("invalid_source");
  const required = conversions.flatMap(c => ["editorial", "production"].map(m => `${m}:${c}`));
  if (!required.length || new Set(required).size !== required.length || conversions.some(c => c !== "off" && c !== "demo")) failures.push("invalid_profiles");
  if (receipts.length !== required.length) failures.push("missing_or_extra_profile");
  const workspaces = new Set<string>();
  for (const key of required) {
    const matches = receipts.filter(r => `${r.mode}:${r.conversion}` === key);
    if (matches.length !== 1) { failures.push(`missing_or_duplicate:${key}`); continue; }
    const r = matches[0];
    if (r.sha !== source.sha || r.tree !== source.tree) failures.push(`source_mismatch:${key}`);
    if (!r.fresh || !r.workspace || workspaces.has(path.resolve(r.workspace))) failures.push(`not_isolated:${key}`);
    workspaces.add(path.resolve(r.workspace));
    const production = r.mode === "production";
    if (r.environment.vercelEnv !== (production ? "production" : "preview") || r.environment.preview !== !production)
      failures.push(`wrong_environment:${key}`);
    const expected = ["install", production ? "verify:production" : "verify:a3r", "source-integrity"];
    if (r.steps.length !== expected.length || r.steps.some((s, i) => s.name !== expected[i] || s.exit !== 0))
      failures.push(`failed_steps:${key}`);
  }
  return { result: failures.length ? "fail" as const : "pass" as const, failures, required };
}

export interface ProductionInsight { documentId: string; slug: string; status: string; title: string }

/** Inspect the exported bytes, independently of the route's visibility decisions. */
export function verifyProductionExport(root: string, entries: readonly ProductionInsight[]) {
  const out = path.join(root, "out");
  const index = load(readFileSync(path.join(out, "insights.html"), "utf8"));
  const published = entries.filter(e => e.status === "published");
  const privateEntries = entries.filter(e => e.status !== "published");
  const reject = (reason: string): never => { throw new Error(`production_export: ${reason}`); };
  // Static HTML is served as 200 unless the distribution explicitly overrides it.
  // Internal .meta status is not delivery evidence. HTTP reception remains mandatory.
  if (["html", "txt", "rsc"].some(ext => existsSync(path.join(out, "insights", `__empty_insights__.${ext}`)))) {
    const config = path.join(root, "vercel.json");
    if (!existsSync(config)) reject("sentinel_http_rule_missing");
    const rule = JSON.parse(readFileSync(config, "utf8")).routes?.[0];
    const expected = "^/insights/__empty_insights__(?:\\.(?:html|txt|rsc))?/?$";
    if (rule?.src !== expected || rule.status !== 404 || rule.dest || rule.continue || rule.methods
      || rule.has || rule.missing || rule.headers?.Location || rule.headers?.location
      || rule.headers?.["X-Robots-Tag"] !== "noindex, nofollow") reject("sentinel_http_rule_invalid");
  }
  const articleLinks = index('main a[href^="/insights/"]').toArray().map(e => index(e).attr("href"));
  if (!published.length) {
    const empty = index('[data-empty-state="insights"]');
    if (empty.length !== 1 || !empty.text().includes("No articles are currently published")) reject("missing_empty_state");
    if (articleLinks.length || index("main .lede").text().includes("Every article")) reject("empty_surface_promises_articles");
  } else if (index('[data-empty-state="insights"]').length) reject("false_empty_state");
  for (const e of published) {
    if (!articleLinks.includes(`/insights/${e.slug}`) || !existsSync(path.join(out, "insights", `${e.slug}.html`)))
      reject(`missing_published:${e.slug}`);
  }
  const inspect = (dir: string) => {
    for (const f of readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, f.name);
      if (f.isDirectory()) { inspect(file); continue; }
      if (!/\.(html|rsc|txt|xml)$/.test(f.name)) continue;
      const bytes = readFileSync(file, "utf8");
      for (const e of privateEntries) {
        // Titles are not identities: a separately published reference fixture can
        // share one with a managed draft. IDs and private routes are forbidden
        // everywhere; draft titles must also stay off the Insights surfaces.
        const insightsSurface = path.relative(out, file) === "insights.html"
          || path.relative(out, file) === "insights.rsc"
          || path.relative(out, file) === "insights.txt"
          || path.relative(out, file).startsWith(`insights${path.sep}`);
        if (bytes.includes(`/insights/${e.slug}`) || bytes.includes(e.documentId)
          || (insightsSurface && bytes.includes(e.title))) reject(`private_insight_leaked:${e.slug}`);
      }
      if (bytes.includes('data-role="draft-badge"') || bytes.includes('data-role="topic-hub-draft-badge"')) reject("draft_badge_leaked");
    }
  };
  inspect(out);
  for (const e of privateEntries) {
    if (["html", "rsc", "txt"].some(ext => existsSync(path.join(out, "insights", `${e.slug}.${ext}`))))
      reject(`private_route_exported:${e.slug}`);
  }
  const manifest = JSON.parse(readFileSync(path.join(out, "content-attribution-manifest.json"), "utf8"));
  for (const e of privateEntries) if (JSON.stringify(manifest).includes(`/insights/${e.slug}`)) reject(`private_attribution:${e.slug}`);
  return { published: published.length, hidden: privateEntries.length, empty: published.length === 0 };
}
