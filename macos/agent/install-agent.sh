#!/bin/bash
# Install the background repair agent (macOS LaunchAgent).
# Usage: install-agent.sh ["/Applications/DeepSeek Harness.app"]
set -euo pipefail
APP="${1:-/Applications/DeepSeek Harness.app}"
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$(cd "$HERE/.." && pwd)"
DEST="$HOME/Library/Application Support/dsh-desktop-profiles"
LOGS="$HOME/Library/Logs/dsh-desktop-profiles"
PLIST="$HOME/Library/LaunchAgents/com.dsh.desktop-profiles.repair.plist"
mkdir -p "$DEST" "$LOGS" "$HOME/Library/LaunchAgents"
rm -rf "$DEST/toolchain"
mkdir -p "$DEST/toolchain"
cp -R "$SRC" "$DEST/toolchain/macos"
rm -rf "$DEST/toolchain/macos/build"
chmod +x "$DEST/toolchain/macos/agent/run.sh" "$DEST/toolchain/macos/install.command" "$DEST/toolchain/macos/uninstall.command" "$DEST/toolchain/macos/launch.command"
cat > "$PLIST" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.dsh.desktop-profiles.repair</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$DEST/toolchain/macos/agent/run.sh</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>DSH_PROFILES_APP</key><string>$APP</string>
    <key>DSH_PROFILES_TOOLCHAIN</key><string>$DEST/toolchain</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>StartInterval</key><integer>20</integer>
  <key>StandardOutPath</key><string>$LOGS/agent.out.log</string>
  <key>StandardErrorPath</key><string>$LOGS/agent.err.log</string>
</dict>
</plist>
PLISTEOF
launchctl unload "$PLIST" 2>/dev/null || true
launchctl load -w "$PLIST"
echo "已安装后台自动修复：LaunchAgent com.dsh.desktop-profiles.repair（每 20 秒检查一次）"
