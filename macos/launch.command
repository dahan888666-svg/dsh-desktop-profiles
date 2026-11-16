#!/bin/bash
# Self-healing launcher: repair the patch after a DSH update, then open the app.
# Usage: ./launch.command ["/Applications/DeepSeek Harness.app"]
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
APP="${1:-/Applications/DeepSeek Harness.app}"

if pgrep -f "$APP/Contents/MacOS/DeepSeek Harness" >/dev/null 2>&1; then
  open "$APP"
  exit 0
fi

if [ ! -f "$APP/Contents/Resources/dsh-profile-patch.json" ]; then
  echo "检测到补丁缺失（可能刚更新过 DSH），正在修复…"
  "$DIR/install.command" "$APP"
else
  open "$APP"
fi
