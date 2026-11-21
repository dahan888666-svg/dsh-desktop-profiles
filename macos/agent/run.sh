#!/bin/bash
# LaunchAgent entry: locate a Node runtime and run one repair pass.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
APP="${DSH_PROFILES_APP:-/Applications/DeepSeek Harness.app}"
TOOLCHAIN="${DSH_PROFILES_TOOLCHAIN:-$(cd "$HERE/../.." && pwd)}"
NODE="$APP/Contents/Resources/runtime/primary-runtime/dependencies/node/bin/node"
if [ ! -x "$NODE" ]; then NODE="$(command -v node || true)"; fi
if [ -z "$NODE" ]; then exit 0; fi
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
exec "$NODE" "$HERE/repair.mjs" --app "$APP" --toolchain "$TOOLCHAIN" "$@"
