import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { assessDelivery, deliveryEnvironment, type Conversion, type DeliveryMode, type ModeReceipt } from "./delivery-certification";

const root = process.cwd();
const git = (args: string[], cwd = root) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
if (git(["status", "--porcelain"])) {
  console.error("Delivery certification requires a clean committed source tree.");
  process.exit(2);
}
const source = { sha: git(["rev-parse", "HEAD"]), tree: git(["rev-parse", "HEAD^{tree}"]) };
const args = process.argv.slice(2);
const selected = args.length === 2 && args[0] === "--conversion" ? args[1] : null;
if (args.length && selected !== "off" && selected !== "demo") throw new Error("usage: verify:delivery [--conversion off|demo]");
const conversions: Conversion[] = selected ? [selected as Conversion] : ["off", "demo"];
const output = path.resolve(".artifacts", "local-ci", source.sha);
fs.mkdirSync(output, { recursive: true });
const runRoot = fs.mkdtempSync(path.join(output, "run-"));
const startedAt = new Date().toISOString();
const receipts: ModeReceipt[] = [];

for (const conversion of conversions) for (const mode of ["editorial", "production"] as DeliveryMode[]) {
  const profile = `${mode}-${conversion}`;
  const dir = path.join(runRoot, profile);
  const workspace = path.join(dir, "source");
  fs.mkdirSync(dir, { recursive: true });
  const fd = fs.openSync(path.join(dir, "commands.log"), "w");
  const env = deliveryEnvironment(process.env, mode, conversion);
  const receipt: ModeReceipt = { ...source, mode, conversion, workspace, fresh: false,
    environment: { vercelEnv: env.VERCEL_ENV!, preview: env.CONTENT_PREVIEW_MODE === "true" }, steps: [] };
  const step = (name: string, command: string, argv: string[], cwd: string) => {
    fs.writeSync(fd, `\n${name}: ${command} ${argv.join(" ")}\n`);
    const r = spawnSync(command, argv, { cwd, env, stdio: ["ignore", fd, fd] });
    const exit = r.status ?? 1;
    receipt.steps.push({ name, exit });
    return exit === 0;
  };
  try {
    if (git(["rev-parse", "HEAD"]) !== source.sha || git(["status", "--porcelain"])) throw new Error("parent source changed");
    execFileSync("git", ["worktree", "add", "--detach", workspace, source.sha], { cwd: root, stdio: ["ignore", fd, fd] });
    receipt.fresh = !fs.existsSync(path.join(workspace, "out")) && !fs.existsSync(path.join(workspace, ".next"));
    if (!receipt.fresh || git(["rev-parse", "HEAD"], workspace) !== source.sha || git(["rev-parse", "HEAD^{tree}"], workspace) !== source.tree)
      throw new Error("isolated source mismatch");
    const installed = step("install", "pnpm", ["install", "--frozen-lockfile", "--prod=false"], workspace);
    const command = mode === "editorial" ? "verify:a3r" : "verify:production";
    if (installed) step(command, "pnpm", [command], workspace);
    else receipt.steps.push({ name: command, exit: 1 });
    const unchanged = !git(["status", "--porcelain"], workspace)
      && git(["rev-parse", "HEAD"], workspace) === source.sha && git(["rev-parse", "HEAD^{tree}"], workspace) === source.tree;
    receipt.steps.push({ name: "source-integrity", exit: unchanged ? 0 : 1 });
  } catch (error) {
    fs.writeSync(fd, `${String(error)}\n`);
  } finally {
    fs.closeSync(fd);
    fs.writeFileSync(path.join(dir, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
    receipts.push(receipt);
  }
}
const assessment = assessDelivery(source, conversions, receipts);
if (git(["rev-parse", "HEAD"]) !== source.sha || git(["status", "--porcelain"])) {
  assessment.result = "fail";
  assessment.failures.push("parent_source_changed");
}
const receipt = { schemaVersion: "textos-site-local-ci@1", ...source, startedAt,
  finishedAt: new Date().toISOString(), node: process.version, ...assessment, modes: receipts, runRoot };
const receiptPath = path.resolve(".artifacts", "local-ci", `${source.sha}.json`);
fs.writeFileSync(path.join(runRoot, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
console.log(`Delivery ${assessment.result.toUpperCase()} — ${receiptPath}`);
process.exit(assessment.result === "pass" ? 0 : 1);
