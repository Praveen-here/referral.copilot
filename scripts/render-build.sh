#!/usr/bin/env bash
# Render build. Render ships its own read-only pnpm and its corepack can't run
# pnpm 12, so we run the exact pnpm from package.json's packageManager via npx.
set -euo pipefail

PNPM_VERSION=$(node -p "require('./package.json').packageManager.split('@')[1]")
pnpm() { npx --yes "pnpm@${PNPM_VERSION}" "$@"; }

pnpm install --frozen-lockfile
pnpm --filter @rc/db generate
pnpm --filter @rc/db run migrate:deploy
pnpm --filter @rc/web build
