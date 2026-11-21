import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { listInsightEntries } from "../lib/content-surface-engine/site-integration/insights-catalog";
import { assessDelivery } from "./delivery-certification";
import { receiveHttp, verifyStagedDeployment } from "./http-reception";

// Read-only operation. No deploy, alias assignment, credentials or promotion.
async function main() {
const argv = process.argv.slice(2);
const allowed = ["--local-receipt", "--deployment", "--git-deployment", "--git-status", "--output"];
if (argv.length !== allowed.length * 2 || allowed.some(k => argv.filter(a => a === k).length !== 1)
  || argv.some((a, i) => i % 2 === 0 && !allowed.includes(a))) throw new Error(`usage: verify:http ${allowed.map(k => `${k} <path>`).join(" ")}`);
const arg = (key: string) => argv[argv.indexOf(key) + 1];
const read = (key: string) => JSON.parse(fs.readFileSync(arg(key), "utf8"));
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trim();
if (git("status", "--porcelain")) throw new Error("HTTP reception requires a clean committed source");
const source = { sha: git("rev-parse", "HEAD"), tree: git("rev-parse", "HEAD^{tree}") };
const local = read("--local-receipt"), deployment = read("--deployment");
const gd = read("--git-deployment"), statuses = read("--git-status");
if (local.result !== "pass" || local.sha !== source.sha || local.tree !== source.tree
  || assessDelivery(source, ["off", "demo"], local.modes).result !== "pass") throw new Error("HTTP reception requires all four local profiles on this SHA/tree");
const origin = verifyStagedDeployment(source.sha, deployment, gd, statuses);
const output = path.resolve(arg("--output"));
fs.mkdirSync(output, { recursive: false });
const strings = (value: unknown): string[] => typeof value === "string" ? [value]
  : value && typeof value === "object" ? Object.values(value).flatMap(strings) : [];
const entries = listInsightEntries().map(e => ({ documentId: e.document.identity.documentId,
  slug: e.slug, title: e.document.identity.title, status: e.document.truth.publicationStatus,
  passages: strings(e.document.body).filter(s => s.length >= 100) }));
let count = 0;
const receipt: Record<string, unknown> = { ...source, origin, deploymentId: deployment.id,
  scope: "staged_production_http", startedAt: new Date().toISOString(), result: "fail",
  inputHashes: Object.fromEntries(allowed.filter(k => k !== "--output").map(k => [k, createHash("sha256").update(fs.readFileSync(arg(k))).digest("hex")])) };
try {
  receipt.responses = await receiveHttp(origin, entries, async url => {
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(30000) });
    return { url, status: response.status, location: response.headers.get("location"),
      headers: Object.fromEntries([...response.headers].filter(([k]) => ["date", "content-type", "location", "x-robots-tag", "x-vercel-id", "x-vercel-cache", "cache-control"].includes(k))),
      body: await response.text() };
  }, response => {
    const index = String(++count).padStart(3, "0");
    fs.writeFileSync(path.join(output, `${index}.json`), JSON.stringify(response, null, 2));
  });
  receipt.result = "pass";
} catch (error) {
  receipt.error = String(error);
} finally {
  receipt.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(output, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
}
console.log(`HTTP_RECEPTION_${String(receipt.result).toUpperCase()} — ${path.join(output, "receipt.json")}`);
process.exit(receipt.result === "pass" ? 0 : 1);
}
main().catch(error => { console.error(String(error)); process.exitCode = 1; });
