import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { listInsightEntries } from "../lib/content-surface-engine/site-integration/insights-catalog";
import { deliveryEnvironment, verifyProductionExport } from "./delivery-certification";

const conversion = process.env.CONVERSION_MODE ?? "off";
if (conversion !== "off" && conversion !== "demo") throw new Error("production certification requires off or demo");
const env = deliveryEnvironment(process.env, "production", conversion);
for (const dir of ["out", ".next"]) fs.rmSync(dir, { recursive: true, force: true });
for (const command of ["typecheck", "build", "validate:jsonld"]) {
  const r = spawnSync("pnpm", [command], { stdio: "inherit", env });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
const result = verifyProductionExport(process.cwd(), listInsightEntries().map(e => ({
  documentId: e.document.identity.documentId, slug: e.slug,
  title: e.document.identity.title, status: e.document.truth.publicationStatus,
})));
console.log(`[verify:production] verified VERCEL_ENV=production, no editorial preview: ${JSON.stringify(result)}`);
