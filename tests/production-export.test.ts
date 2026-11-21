import { afterEach, expect, test } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { verifyProductionExport } from "../scripts/delivery-certification";

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));
const hidden = { documentId: "private:insight", slug: "private-insight", title: "Confidential fixture title", status: "draft" };
const empty = '<main><p class="lede">Insights</p><section data-empty-state="insights">No articles are currently published in this section.</section></main>';
function fixture(index = empty) {
  const root = mkdtempSync(join(tmpdir(), "production-export-")); roots.push(root);
  const put = (p: string, body: string) => { const f = join(root, p); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, body); };
  put("out/insights.html", index);
  put("out/content-attribution-manifest.json", '{"entries":[]}');
  return { root, put };
}
test("public Insights is honestly empty with twelve unpublished inputs", () => {
  const f = fixture();
  const entries = Array.from({ length: 12 }, (_, i) => ({ ...hidden, slug: `private-${i}` }));
  expect(verifyProductionExport(f.root, entries)).toEqual({ published: 0, hidden: 12, empty: true });
});
test("an editorial-only index without the empty state is refused", () => {
  const f = fixture('<main><h1>Insights</h1></main>');
  expect(() => verifyProductionExport(f.root, [hidden])).toThrow("missing_empty_state");
});
test("an empty index cannot claim that articles are available", () => {
  const f = fixture(empty.replace("Insights</p>", "Every article is available</p>"));
  expect(() => verifyProductionExport(f.root, [hidden])).toThrow("empty_surface_promises_articles");
});
test.each(["html", "rsc", "txt", "xml"])("private content in any exported %s is refused", ext => {
  const f = fixture(); f.put(`out/elsewhere.${ext}`, hidden.documentId);
  expect(() => verifyProductionExport(f.root, [hidden])).toThrow("private_insight_leaked");
});
test.each(["html", "txt"])("a draft title without a link still cannot appear on Insights %s", ext => {
  const f = fixture(); f.put(`out/insights.${ext}`, empty + `<aside>${hidden.title}</aside>`);
  expect(() => verifyProductionExport(f.root, [hidden])).toThrow("private_insight_leaked");
});
test("a separate reference document sharing a title is not the managed draft", () => {
  const f = fixture();
  f.put("out/reference-preview/published.html", `<article data-cse-content-id="published:reference">${hidden.title}</article>`);
  expect(verifyProductionExport(f.root, [hidden]).hidden).toBe(1);
});
test.each(["html", "rsc", "txt"])("private article route is refused even with an empty %s body", ext => {
  const f = fixture(); f.put(`out/insights/${hidden.slug}.${ext}`, "");
  expect(() => verifyProductionExport(f.root, [hidden])).toThrow("private_route_exported");
});
test("private entries in the attribution manifest are refused", () => {
  const f = fixture(); f.put("out/content-attribution-manifest.json", JSON.stringify({ entries: [{ path: `/insights/${hidden.slug}` }] }));
  expect(() => verifyProductionExport(f.root, [hidden])).toThrow("private_attribution");
});
test("a real published entry needs a public link and an exported page", () => {
  const f = fixture('<main><a href="/insights/published">Published article</a></main>');
  f.put("out/insights/published.html", "<article>Published article</article>");
  expect(verifyProductionExport(f.root, [{ documentId: "public:insight", slug: "published", title: "Published article", status: "published" }]).published).toBe(1);
});
test("a missing published export cannot be promised by the index", () => {
  const f = fixture('<main><a href="/insights/published">Published article</a></main>');
  expect(() => verifyProductionExport(f.root, [{ documentId: "public:insight", slug: "published", title: "Published article", status: "published" }])).toThrow("missing_published");
});
