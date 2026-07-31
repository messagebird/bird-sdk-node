#!/usr/bin/env bash
# Post-publish smoke test for @messagebird/sdk on npm.
#
# Install the just-published version into a throwaway package and import the
# client over the package's real ESM entrypoint. This proves the published
# tarball's "files" allowlist is complete (a missing dist/ file surfaces as a
# failed import, not a runtime surprise for a consumer) and that the package
# resolves with no repo context. Import-only by design: it validates packaging,
# not API calls (a real call would need credentials).
#
# Usage: smoke.sh <version> [registry-url]
# Called by: the mirror release workflow after publish.
set -euo pipefail
ver="${1:?usage: smoke.sh <version> [registry-url]}"
registry="${2:-https://registry.npmjs.org/}"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
cd "$tmp"

npm init -y >/dev/null 2>&1
npm pkg set type=module >/dev/null
# A just-published version can lag npm's registry read-replicas/CDN, so retry for
# ~5 minutes. Never pass --silent, and print npm's error on the last attempt: a
# swallowed error makes a propagation lag look identical to a packaging break.
attempts=10
for attempt in $(seq 1 "$attempts"); do
	if out=$(npm install --no-fund --no-audit --registry "$registry" "@messagebird/sdk@${ver}" 2>&1); then
		break
	fi
	if [ "$attempt" -eq "$attempts" ]; then
		echo "smoke: @messagebird/sdk@${ver} not installable after ${attempts} attempts (~5m); last error:" >&2
		printf '%s\n' "$out" | sed 's/^/  /' >&2
		exit 1
	fi
	echo "smoke: @messagebird/sdk@${ver} not available yet — retrying in 30s (attempt ${attempt}/${attempts})"
	sleep 30
done

node --input-type=module -e "
import { BirdClient } from '@messagebird/sdk';
if (typeof BirdClient !== 'function') throw new Error('BirdClient export missing from @messagebird/sdk');
console.log('@messagebird/sdk ${ver} smoke OK');
"
