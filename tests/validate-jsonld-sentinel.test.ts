// CLI regression contract: the original 12 diagnostic oracles, plus refusal cases.
import { afterAll, test } from "vitest";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const validator = join(process.cwd(), "scripts/validate-jsonld.mjs");
const fixtures = mkdtempSync(join(tmpdir(), "textos-jsonld-sentinel-"));
afterAll(() => rmSync(fixtures, { recursive: true, force: true }));
const context = "https://schema.org";
const jsonld = (nodes: unknown) => `<script type="application/ld+json">${JSON.stringify(nodes)}</script>`;
const article = jsonld({ "@context": context, "@type": "Article", headline: "Fixture éditoriale" });
const home = jsonld({ "@context": context, "@type": "SoftwareApplication",
  featureList: ["Authority Presence measurement"] });
const notFound = '<html><head><meta name="robots" content="noindex,nofollow"></head>' +
  '<body><main><h1>Page not found</h1></main>' +
  '<script>const digest="NEXT_HTTP_ERROR_FALLBACK;404";</script></body></html>';
const sentinel = "__empty_insights__.html";
const metaPath = ".next/server/app/insights/__empty_insights__.meta";
const htmlPath = ".next/server/app/insights/__empty_insights__.html";

function execute(name: string, options: {
  insights?: Record<string, string>; meta?: unknown; internalHtml?: string; rawMeta?: string;
} = {}) {
  const cwd = join(fixtures, name);
  const put = (p: string, value: string) => {
    const f = join(cwd, p);
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(f, value);
  };
  put("out/index.html", home);
  put("content/faq/fixture.md", "# Fixture");
  put("out/faq/fixture.html", article);
  put("content/insights/fixture.md", "# Fixture");
  for (const [file, html] of Object.entries(options.insights ?? {})) put(`out/insights/${file}`, html);
  if (options.meta !== undefined) put(metaPath, JSON.stringify(options.meta));
  if (options.rawMeta !== undefined) put(metaPath, options.rawMeta);
  if (options.internalHtml !== undefined) put(htmlPath, options.internalHtml);
  const result = spawnSync(process.execPath, [validator], { cwd, encoding: "utf8" });
  assert.ifError(result.error);
  return result;
}

test('01 — seule la sentinelle 404 attestée ne doit pas bloquer un export sain', () => {
  const r = execute('01-sentinel-404', { insights: { [sentinel]: notFound },
    meta: { status: 404 }, internalHtml: notFound });
  assert.equal(r.status, 0, r.stderr);
});

test('02 — un vrai article avec JSON-LD reste accepté', () => {
  const r = execute('02-real-valid', { insights: { 'article.html': article } });
  assert.equal(r.status, 0, r.stderr);
});

test('03 — un vrai article sans JSON-LD reste refusé', () => {
  const r = execute('03-real-missing', { insights: { 'article.html': '<article>Texte réel</article>' } });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /aucun bloc JSON-LD dans out\/insights\/article\.html/);
});

test('04 — noindex seul ne dispense jamais une vraie page du JSON-LD', () => {
  const r = execute('04-real-noindex', { insights: { 'article.html': '<meta name="robots" content="noindex"><article>Texte réel</article>' } });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /aucun bloc JSON-LD/);
});

test('05 — une autre page 404 ne bénéficie pas de l’exception réservée', () => {
  const r = execute('05-other-404', { insights: { 'article.html': notFound },
    meta: { status: 404 }, internalHtml: notFound });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /out\/insights\/article\.html/);
});

test('06 — le nom de sentinelle ne suffit pas si son statut est 200', () => {
  const r = execute('06-sentinel-200', { insights: { [sentinel]: '<article>Contenu sans JSON-LD</article>' },
    meta: { status: 200 }, internalHtml: '<article>Contenu sans JSON-LD</article>' });
  assert.equal(r.status, 1);
});

test('07 — une sentinelle sans preuve de statut reste refusée', () => {
  const r = execute('07-metadata-missing', { insights: { [sentinel]: notFound }, internalHtml: notFound });
  assert.equal(r.status, 1);
});

test('08 — des métadonnées d’un HTML différent ne permettent aucune exemption', () => {
  const r = execute('08-stale-metadata', { insights: { [sentinel]: '<article>Texte différent</article>' },
    meta: { status: 404 }, internalHtml: notFound });
  assert.equal(r.status, 1);
});

test('09 — la sentinelle 404 ne doit pas masquer une vraie page invalide', () => {
  const r = execute('09-sentinel-and-invalid', { insights: {
    [sentinel]: notFound, 'article.html': '<article>Texte sans JSON-LD</article>' },
    meta: { status: 404 }, internalHtml: notFound });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /aucun bloc JSON-LD dans out\/insights\/article\.html/);
});

test('10 — un vrai brouillon noindex avec WebPage honnête reste accepté', () => {
  const r = execute('10-draft-valid', { insights: { 'draft.html': '<meta name="robots" content="noindex">' +
    jsonld({ '@context': context, '@type': 'WebPage', name: 'Brouillon' }) } });
  assert.equal(r.status, 0, r.stderr);
});

test('11 — un JSON-LD éditorial non parsable reste refusé', () => {
  const r = execute('11-malformed', { insights: { 'article.html': '<script type="application/ld+json">{broken</script>' } });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /JSON-LD non parsable/);
});

test('12 — SoftwareApplication reste interdit sur une vraie page éditoriale', () => {
  const r = execute('12-forbidden-type', { insights: { 'article.html': jsonld([
    { '@context': context, '@type': 'Article', headline: 'Fixture' },
    { '@context': context, '@type': 'SoftwareApplication' }]) } });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /SoftwareApplication interdit/);
});


test("13 — une sentinelle attestée mais sans noindex reste refusée", () => {
  const html = notFound.replace('content="noindex,nofollow"', 'content="nofollow"');
  const r = execute("13-no-noindex", { insights: { [sentinel]: html }, meta: { status: 404 }, internalHtml: html });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /aucun bloc JSON-LD/);
});

test("14 — une page ordinaire renommée, même avec statut 404, reste contrôlée", () => {
  const html = '<meta name="robots" content="noindex"><main>Ordinary page</main>';
  const r = execute("14-renamed-page", { insights: { [sentinel]: html }, meta: { status: 404 }, internalHtml: html });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /aucun bloc JSON-LD/);
});

test("15 — citer le marqueur 404 dans le texte ne suffit pas", () => {
  const html = '<meta name="robots" content="noindex"><main>NEXT_HTTP_ERROR_FALLBACK;404</main>';
  const r = execute("15-marker-as-text", { insights: { [sentinel]: html }, meta: { status: 404 }, internalHtml: html });
  assert.equal(r.status, 1);
});

test("16 — des métadonnées non parsables n'accordent aucune exemption", () => {
  const r = execute("16-malformed-metadata", { insights: { [sentinel]: notFound }, rawMeta: "{broken", internalHtml: notFound });
  assert.equal(r.status, 1);
});

test("17 — une directive index contradictoire empêche l'exemption", () => {
  const html = notFound.replace('content="noindex,nofollow"', 'content="noindex,index"');
  const r = execute("17-conflicting-robots", { insights: { [sentinel]: html }, meta: { status: 404 }, internalHtml: html });
  assert.equal(r.status, 1);
});

test("18 — un corps éditorial sous le nom réservé reste contrôlé", () => {
  const html = notFound.replace("<main>", "<article>Real editorial content</article><main>");
  const r = execute("18-editorial-body", { insights: { [sentinel]: html }, meta: { status: 404 }, internalHtml: html });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /aucun bloc JSON-LD/);
});
