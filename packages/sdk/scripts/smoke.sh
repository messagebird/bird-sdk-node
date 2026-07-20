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
# A just-published version can lag npm's registry read-replicas/CDN for a few
# minutes, so retry over a ~5-minute budget before giving up — the publish has
# already succeeded; this step only guards packaging (the "files" allowlist and
# ESM entrypoint), so a short window would fail spuriously on propagation alone.
for attempt in $(seq 1 10); do
	if npm install --silent --registry "$registry" "@messagebird/sdk@${ver}"; then
		break
	fi
	[ "$attempt" -eq 10 ] && { echo "smoke: @messagebird/sdk@${ver} not installable after 10 attempts (~5m of registry lag)" >&2; exit 1; }
	echo "smoke: @messagebird/sdk@${ver} not available yet — retrying in 30s (attempt ${attempt}/10)"
	sleep 30
done

node --input-type=module -e "
import { BirdClient } from '@messagebird/sdk';
if (typeof BirdClient !== 'function') throw new Error('BirdClient export missing from @messagebird/sdk');
console.log('@messagebird/sdk ${ver} smoke OK');
"
