#!/usr/bin/env bash
# CI LOCALE — décision de Marc du 30/10/2026 : « je ne vais pas payer les GitHub Actions ».
#
# `pnpm ci:local` rejoue, sur le commit COURANT, les deux jobs de `.github/workflows/ci.yml` :
#   - build-validate : `verify:a3r` sous CONVERSION_MODE=off puis demo (la matrice du workflow) ;
#   - product-truth  : `verify:product-manifest`.
# Écrit un reçu `.artifacts/local-ci/<sha>.json` (SHA, arbre, code de sortie de chaque étape), à citer
# dans le message de fusion. Refuse un arbre modifié : le gate porte sur un commit.
set -uo pipefail

if [ -n "$(git status --porcelain)" ]; then
  echo "✗ arbre modifié : la CI locale porte sur un commit. Commitez ou mettez de côté vos changements." >&2
  exit 2
fi

SHA="$(git rev-parse HEAD)"
TREE="$(git rev-parse 'HEAD^{tree}')"
OUT=".artifacts/local-ci"
mkdir -p "$OUT"
LOG="$OUT/$SHA.log"
STEPS="$(mktemp)"
STARTED="$(date -u +%FT%TZ)"
: > "$LOG"
echo "CI locale (site) — SHA $SHA — arbre $TREE" | tee -a "$LOG"

step() {
  local name="$1"; shift
  local begin end code
  begin="$(date +%s)"
  echo "=== $name : $*" | tee -a "$LOG"
  "$@" >>"$LOG" 2>&1
  code=$?
  end="$(date +%s)"
  printf '%s\t%s\t%s\t%s\n' "$name" "$*" "$code" "$((end - begin))" >>"$STEPS"
  if [ "$code" -eq 0 ]; then echo "    ✓ ($((end - begin)) s)"; else echo "    ✗ exit $code ($((end - begin)) s) — voir $LOG"; fi
}

step "install" pnpm install --frozen-lockfile
step "verify:a3r (CONVERSION_MODE=off)" env CONVERSION_MODE=off pnpm verify:a3r
step "verify:a3r (CONVERSION_MODE=demo)" env CONVERSION_MODE=demo pnpm verify:a3r
step "verify:product-manifest" pnpm verify:product-manifest

FINISHED="$(date -u +%FT%TZ)"
RECEIPT="$OUT/$SHA.json"
node -e '
const fs = require("fs");
const [stepsFile, receipt, sha, tree, started, finished, log] = process.argv.slice(1);
const steps = fs.readFileSync(stepsFile, "utf8").trim().split("\n").filter(Boolean).map((line) => {
  const [name, command, exit, seconds] = line.split("\t");
  return { name, command, exit: Number(exit), seconds: Number(seconds) };
});
const result = steps.every((s) => s.exit === 0) ? "pass" : "fail";
fs.writeFileSync(receipt, JSON.stringify({
  schemaVersion: "textos-site-local-ci@1", sha, tree, startedAt: started, finishedAt: finished,
  node: process.version, result, steps, log,
}, null, 2) + "\n");
console.log(`\nRésultat : ${result.toUpperCase()} — reçu ${receipt}`);
process.exit(result === "pass" ? 0 : 1);
' "$STEPS" "$RECEIPT" "$SHA" "$TREE" "$STARTED" "$FINISHED" "$LOG"
CODE=$?
rm -f "$STEPS"
exit "$CODE"
