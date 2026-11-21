import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { receiveHttp, receptionRoutes, verifyHttpResponse, verifyStagedDeployment, type HttpObservation } from "../scripts/http-reception";

const entry = { documentId: "private:identity", slug: "private-draft", title: "Private draft title", status: "draft", passages: [] };
const notFound = '<meta name="robots" content="noindex,nofollow"><script>"NEXT_HTTP_ERROR_FALLBACK;404"</script>';
const response = (status = 404, body = notFound): HttpObservation => ({ url: "https://fixture.invalid/insights/__empty_insights__", status, body, location: null, headers: {} });
const route = "/insights/__empty_insights__";
test("internal 404 markers and green local exports cannot turn HTTP 200 into PASS", () => {
  expect(() => verifyHttpResponse(response(200), route, [entry])).toThrow("expected_404:got_200");
});
test("a real HTTP 404 with noindex and no editorial content is accepted", () => {
  expect(verifyHttpResponse(response(), route, [entry]).status).toBe(404);
});
test("a redirect to a 404 is not a 404 response", () => {
  expect(() => verifyHttpResponse({ ...response(307), location: "/404" }, route, [entry])).toThrow("redirect_refused");
});
test("a private identity in a 404 body remains an exposure", () => {
  expect(() => verifyHttpResponse(response(404, notFound + entry.documentId), route, [entry])).toThrow("DRAFT_EXPOSURE_CONFIRMED");
});
test.each([entry.title, '<article>Ordinary content</article>', '<script type="application/ld+json">{"@type":"Article"}</script>'])("404 cannot hide editorial content %s", body => {
  expect(() => verifyHttpResponse(response(404, notFound + body), route, [entry])).toThrow();
});
test("a 404 without noindex is refused", () => {
  expect(() => verifyHttpResponse(response(404, "Not found"), route, [entry])).toThrow("error_page_invalid");
});
test("noindex can be delivered by the HTTP response header", () => {
  expect(verifyHttpResponse({ ...response(404, "Not found"), headers: { "x-robots-tag": "noindex, nofollow" } }, route, [entry]).status).toBe(404);
});
test("all twelve draft slugs and file variants are mandatory", () => {
  const entries = Array.from({ length: 12 }, (_, i) => ({ ...entry, slug: `draft-${i}` }));
  const routes = receptionRoutes(entries);
  expect(routes).toHaveLength(57);
  for (const e of entries) for (const ext of ["", ".html", ".txt", ".rsc"]) expect(routes).toContain(`/insights/${e.slug}${ext}`);
});
test("HTTP reception stops after preserving the first exposed response", async () => {
  const requested: string[] = [], recorded: HttpObservation[] = [];
  await expect(receiveHttp("https://fixture.invalid", [entry], async url => {
    requested.push(url); return { ...response(200, entry.documentId), url };
  }, r => recorded.push(r))).rejects.toThrow("DRAFT_EXPOSURE_CONFIRMED");
  expect(requested).toHaveLength(1); expect(recorded).toHaveLength(1);
});
test("the platform rule blocks only the technical sentinel and all its file variants", () => {
  const config = JSON.parse(readFileSync("vercel.json", "utf8"));
  const rule = config.routes[0], matches = new RegExp(rule.src);
  expect(rule.status).toBe(404); expect(rule.headers.Location).toBeUndefined();
  for (const ext of ["", ".html", ".txt", ".rsc", "/"]) expect(matches.test(route + ext)).toBe(true);
  for (const path of ["/insights", "/insights/published", "/legal/cgv", route + "-article", "/other/__empty_insights__"]) expect(matches.test(path)).toBe(false);
});

const deployment = { name: "textos-site", contextName: "marcprp-5751s-projects", target: "production", readyState: "READY",
  id: "dpl_fixture", url: "textos-site-fixture-marcprp-5751s-projects.vercel.app", aliases: [] };
const gd = { id: 1, sha: "a".repeat(40), environment: "Production", repository_url: "https://api.github.com/repos/gangster-nerd/textos-site" };
const statuses = [{ state: "success", environment_url: `https://${deployment.url}`, deployment_url: "https://api.github.com/repos/gangster-nerd/textos-site/deployments/1" }];
test("only the exact staged Production Git identity can be received", () => {
  expect(verifyStagedDeployment(gd.sha, deployment, gd, statuses)).toBe(`https://${deployment.url}`);
  expect(() => verifyStagedDeployment("b".repeat(40), deployment, gd, statuses)).toThrow("provenance");
});
test.each([{ target: "preview" }, { aliases: ["textos-site.vercel.app"] }, { readyState: "ERROR" }, { name: "other-project" }])(
  "an editorial preview or already promoted deployment %j cannot certify prepublication", change => {
    expect(() => verifyStagedDeployment(gd.sha, { ...deployment, ...change }, gd, statuses)).toThrow("Production deployment with NO assigned aliases");
  });
