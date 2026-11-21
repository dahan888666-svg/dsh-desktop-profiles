#!/bin/bash
# Restore the official app.asar on macOS and remove the repair agent.
# Usage: ./uninstall.command ["/Applications/DeepSeek Harness.app"] [--no-quit] [--no-open]
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
APP="/Applications/DeepSeek Harness.app"
NO_QUIT=0
NO_OPEN=0
for arg in "$@"; do
  case "$arg" in
    --no-quit) NO_QUIT=1 ;;
    --no-open) NO_OPEN=1 ;;
    *) APP="$arg" ;;
  esac
done
RES="$APP/Contents/Resources"
NODE="$RES/runtime/primary-runtime/dependencies/node/bin/node"
if [ ! -x "$NODE" ]; then NODE="$(command -v node || true)"; fi
if [ -z "$NODE" ]; then echo "未找到 node"; exit 1; fi

# Remove the repair agent first: otherwise it would immediately re-patch.
if [ -x "$DIR/agent/uninstall-agent.sh" ]; then
  bash "$DIR/agent/uninstall-agent.sh" || true
fi

if [ "$NO_QUIT" = "0" ]; then
  osascript -e 'tell application "DeepSeek Harness" to quit' >/dev/null 2>&1 || true
  sleep 2
  pkill -f "$APP/Contents/MacOS/DeepSeek Harness" 2>/dev/null || true
  sleep 1
fi

"$NODE" "$DIR/installer/revert.mjs" "$APP"
if [ "$NO_OPEN" = "0" ]; then open "$APP"; fi
echo "已恢复官方界面；Profile 数据仍在 ~/.dsh/desktop-profiles。"
