import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

/**
 * Distribution carrier for the DSH Desktop Profiles enhancement.
 *
 * A DSH bundle runs inside the Host/Client, so it cannot rewrite the Electron
 * shell by itself. This plugin therefore reports whether the shell patch is
 * installed (and which version) and points at the installers in this
 * repository. The actual install happens in the .app / DSH directory, outside
 * the Host: run ./install-macos.command or Install-Windows.cmd.
 */
export const name = 'desktop-profiles'

/** Where the shell patch drops its marker on the current platform. */
function patchMarker() {
  const installDir = dirname(process.execPath)
  // macOS: Contents/MacOS/DeepSeek Harness -> Contents/Resources
  // Windows: <DSH>\DeepSeek Harness.exe -> <DSH>\resources
  const candidates = [join(installDir, '..', 'Resources', 'dsh-profile-patch.json'), join(installDir, 'resources', 'dsh-profile-patch.json')]
  return candidates.find((candidate) => existsSync(candidate))
}

export function apply(ctx) {
  const logger = ctx.logger?.('desktop-profiles')
  try {
    const marker = patchMarker()
    const dataDir = process.platform === 'darwin' ? '~/.dsh/desktop-profiles' : '%USERPROFILE%\\.dsh\\desktop-profiles'
    if (marker === undefined) {
      logger?.info('shell patch not installed; run ./install-macos.command (macOS) or Install-Windows.cmd (Windows) from the repository root')
      return
    }
    const manifest = JSON.parse(readFileSync(marker, 'utf8'))
    logger?.info(`shell patch ${manifest.patchVersion} active for DSH ${manifest.desktopVersion}; profiles live in ${dataDir}`)
  } catch (error) {
    logger?.warn(`could not inspect the desktop patch: ${String(error)}`)
  }
}
