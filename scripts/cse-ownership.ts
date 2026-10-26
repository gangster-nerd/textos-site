// `pnpm cse:ownership --product <chemin textos-v0> [--refresh]`
//
// Compare les fichiers CSE propriété du produit, vendus dans ce site, à leur source dans un checkout
// LOCAL de textos-v0 (même convention que `content:sync` : TEXTOS_PRODUCT_REPO ou --product).
//   (défaut)   lecture seule : rapporte chaque écart produit ↔ site, sort en 1 s'il y en a ;
//   --refresh  après un re-vendoring DÉLIBÉRÉ : copie les fichiers product_owned depuis le produit,
//              puis re-scelle les empreintes (product_owned, site_adapted, contrats) et la référence
//              produit (branche@sha du checkout).
// Jamais lancé en CI : la CI ne vérifie que les scellés (`tests/cse-ownership.test.ts`).

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const CSE_ROOT = path.resolve("lib/content-surface-engine");
const MANIFEST_PATH = path.join(CSE_ROOT, "OWNERSHIP.json");

interface OwnedFile {
  path: string;
  sha256: string;
  productPath: string;
  productSha256?: string;
}

export interface CseOwnership {
  manifestVersion: "cse-ownership@1";
  productRepository: string;
  productRef: string;
  rule: string;
  productOwned: OwnedFile[];
  siteAdapted: OwnedFile[];
  productOwnedContracts: OwnedFile[];
}

export const CSE_OWNERSHIP = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as CseOwnership;

export function classifyCseFile(rel: string): "product_owned" | "site_adapted" | "site_owned" | "manifest" {
  if (rel === "OWNERSHIP.json") return "manifest";
  if (CSE_OWNERSHIP.productOwned.some((e) => e.path === rel)) return "product_owned";
  if (CSE_OWNERSHIP.siteAdapted.some((e) => e.path === rel)) return "site_adapted";
  return "site_owned";
}

const sha256 = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function main() {
  const product = flag("product") ?? process.env.TEXTOS_PRODUCT_REPO;
  if (!product) throw new Error("--product <chemin textos-v0> (ou TEXTOS_PRODUCT_REPO) requis");
  const refresh = process.argv.includes("--refresh");
  const drift: string[] = [];

  for (const e of CSE_OWNERSHIP.productOwned) {
    const source = path.join(product, e.productPath);
    if (sha256(source) !== sha256(path.join(CSE_ROOT, e.path))) {
      drift.push(`product_owned ${e.path} ≠ ${e.productPath}`);
      if (refresh) copyFileSync(source, path.join(CSE_ROOT, e.path));
    }
  }
  for (const e of CSE_OWNERSHIP.productOwnedContracts) {
    if (sha256(path.join(product, e.productPath)) !== sha256(path.resolve(e.path))) {
      drift.push(`contrat ${e.path} ≠ ${e.productPath}`);
      if (refresh) copyFileSync(path.join(product, e.productPath), path.resolve(e.path));
    }
  }
  for (const e of CSE_OWNERSHIP.siteAdapted) {
    if (sha256(path.join(product, e.productPath)) !== e.productSha256) {
      drift.push(`site_adapted ${e.path} : la source produit ${e.productPath} a évolué — reporter l'évolution dans le fork`);
    }
  }

  if (refresh) {
    const branch = execFileSync("git", ["-C", product, "rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8" }).trim();
    const head = execFileSync("git", ["-C", product, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const next: CseOwnership = {
      ...CSE_OWNERSHIP,
      productRef: `${branch}@${head}`,
      productOwned: CSE_OWNERSHIP.productOwned.map((e) => ({ ...e, sha256: sha256(path.join(CSE_ROOT, e.path)) })),
      siteAdapted: CSE_OWNERSHIP.siteAdapted.map((e) => ({
        ...e,
        sha256: sha256(path.join(CSE_ROOT, e.path)),
        productSha256: sha256(path.join(product, e.productPath)),
      })),
      productOwnedContracts: CSE_OWNERSHIP.productOwnedContracts.map((e) => ({ ...e, sha256: sha256(path.resolve(e.path)) })),
    };
    writeFileSync(MANIFEST_PATH, JSON.stringify(next, null, 2) + "\n");
  }

  process.stdout.write(JSON.stringify({ productRef: CSE_OWNERSHIP.productRef, refreshed: refresh, drift }, null, 2) + "\n");
  if (drift.length > 0 && !refresh) process.exitCode = 1;
}

if (process.argv[1]?.endsWith("cse-ownership.ts")) main();
