#!/bin/bash
# Restore the official app.asar on macOS.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
APP="${1:-/Applications/DeepSeek Harness.app}"
RES="$APP/Contents/Resources"
NODE="$RES/runtime/primary-runtime/dependencies/node/bin/node"
if [ ! -x "$NODE" ]; then NODE="$(command -v node || true)"; fi
if [ -z "$NODE" ]; then echo "未找到 node"; exit 1; fi

osascript -e 'tell application "DeepSeek Harness" to quit' >/dev/null 2>&1 || true
sleep 2
pkill -f "$APP/Contents/MacOS/DeepSeek Harness" 2>/dev/null || true
sleep 1

"$NODE" "$DIR/installer/revert.mjs" "$APP"
open "$APP"
echo "已恢复官方界面；Profile 数据仍在 ~/.dsh/desktop-profiles。"
