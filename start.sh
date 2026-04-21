#!/usr/bin/env bash
# Start the Vite dev server for the OME MMT UI.
# The HTTP gateway (proxied at /api -> :8080) must be started separately.

FRONTEND="$(cd "$(dirname "$0")" && pwd)"

if ! command -v node &>/dev/null; then
  echo "ERROR: node is not installed or not in PATH"
  exit 1
fi

echo "==> Installing frontend deps (if needed)..."
cd "$FRONTEND" && npm install --silent

echo "==> Starting Vite dev server on :5173"
echo "    (API requests proxied to http://localhost:8080)"
echo ""
npm run dev