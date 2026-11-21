#!/bin/bash
# Remove the background repair agent.
set -euo pipefail
PLIST="$HOME/Library/LaunchAgents/com.dsh.desktop-profiles.repair.plist"
launchctl unload "$PLIST" 2>/dev/null || true
rm -f "$PLIST"
rm -rf "$HOME/Library/Application Support/dsh-desktop-profiles/toolchain"
echo "已移除后台自动修复"
