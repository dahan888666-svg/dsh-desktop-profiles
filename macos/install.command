#!/bin/bash
# Install / repair DSH Desktop Profiles on macOS.
# Usage: ./install.command ["/Applications/DeepSeek Harness.app"] [--no-quit] [--no-open] [--no-agent]
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
APP="/Applications/DeepSeek Harness.app"
NO_QUIT=0
NO_OPEN=0
NO_AGENT=0
for arg in "$@"; do
  case "$arg" in
    --no-quit) NO_QUIT=1 ;;
    --no-open) NO_OPEN=1 ;;
    --no-agent) NO_AGENT=1 ;;
    *) APP="$arg" ;;
  esac
done

if [ ! -f "$APP/Contents/Resources/app.asar" ]; then
  echo "找不到 $APP/Contents/Resources/app.asar"
  read -r -p "请输入 DeepSeek Harness.app 路径: " APP
fi
RES="$APP/Contents/Resources"
ASAR="$RES/app.asar"
STOCK="$RES/app.asar.stock"

NODE="$RES/runtime/primary-runtime/dependencies/node/bin/node"
if [ ! -x "$NODE" ]; then NODE="$(command -v node || true)"; fi
if [ -z "$NODE" ]; then echo "未找到 node；可安装 Node.js，或改用 app 内置的 node 路径"; exit 1; fi

if [ "$NO_QUIT" = "0" ]; then
  echo "==> 退出 DeepSeek Harness"
  osascript -e 'tell application "DeepSeek Harness" to quit' >/dev/null 2>&1 || true
  sleep 2
  pkill -f "$APP/Contents/MacOS/DeepSeek Harness" 2>/dev/null || true
  sleep 1
fi

if [ ! -w "$RES" ]; then
  echo "!! 没有 $RES 的写权限。请把 app 拖到 ~/Applications，或使用 sudo 运行本脚本。"
  exit 1
fi

echo "==> 备份官方 app.asar"
[ -f "$STOCK" ] || cp "$ASAR" "$STOCK"

echo "==> 用当前官方 app.asar 构建补丁（版本不匹配会拒绝）"
"$NODE" "$DIR/tools/build.mjs" "$DIR" "$STOCK"

echo "==> 安装补丁（替换 app.asar 并做 ad-hoc 重新签名）"
"$NODE" "$DIR/installer/deploy.mjs" "$APP" --payload "$DIR/build/app"

if [ "$NO_AGENT" = "0" ] && [ -x "$DIR/agent/install-agent.sh" ]; then
  echo "==> 安装后台自动修复（DSH 升级后自动重打补丁）"
  bash "$DIR/agent/install-agent.sh" "$APP" || echo "[!] 后台自动修复安装失败；手动运行 install.command 仍可修复"
fi

if [ "$NO_OPEN" = "0" ]; then
  echo "==> 启动 DeepSeek Harness"
  open "$APP"
fi
echo "完成：侧边栏“新会话”上方应出现 Profile 行。"
