#!/usr/bin/env bash
# Same committed SHA, fresh isolated editorial AND Production builds; cumulative receipt.
# verify:delivery retains the clean-tree guard and the off/demo conversion contracts.
set -euo pipefail
exec pnpm verify:delivery
