#!/usr/bin/env bash
# Sync app/ contents to docs/ (GitHub Pages deployment directory)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR/app"
DOCS_DIR="$SCRIPT_DIR/docs"

rsync -av --delete \
  --exclude='server.py' \
  "$APP_DIR/" "$DOCS_DIR/"

echo "docs/ synced from app/"
