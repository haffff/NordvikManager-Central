#!/usr/bin/env bash
# Copies the files the Central server needs at runtime into a staging dir.
# Used by both the release (zip) and deploy (FTP) workflows so they ship the
# same set of files. Explicit allowlist: no .env, data/, docs-site/, .claude/.
#
# Usage: scripts/stage-server.sh <out-dir> [version]
set -euo pipefail

OUT="${1:?usage: stage-server.sh <out-dir> [version]}"
VERSION="${2:-}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

FILES=(index.js logger.js package.json package-lock.json .env.example)
DIRS=(config db middleware routes services signaling swagger static)

rm -rf "$OUT"
mkdir -p "$OUT"

for f in "${FILES[@]}"; do cp "$ROOT/$f" "$OUT/"; done
for d in "${DIRS[@]}"; do cp -r "$ROOT/$d" "$OUT/"; done

# The player frontend is deployed separately (umbrella repo's player deployment).
rm -rf "$OUT/static/client"

if [ -n "$VERSION" ]; then
  (cd "$OUT" && npm version "$VERSION" --no-git-tag-version --allow-same-version >/dev/null)
fi

echo "Staged Central server into $OUT${VERSION:+ (version $VERSION)}"
