#!/usr/bin/env node
// Repair the Desktop Profiles shell patch after a DeepSeek Harness update.
//
// Runs from a LaunchAgent (macOS) or a startup watcher (Windows). It detects
// that the installed app.asar no longer carries the patch, rebuilds the patch
// from the app's own asar (so it adapts to the new DSH version as long as the
// shell anchors still exist), and installs it without touching user data.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { readArchive, readEntry } from '../tools/asar.mjs'

const args = process.argv.slice(2)
const arg = (name, fallback) => {
  const index = args.indexOf(name)
  return index === -1 || args[index + 1] === undefined ? fallback : args[index + 1]
}
const isMac = process.platform === 'darwin'
const app = path.resolve(arg('--app', isMac ? '/Applications/DeepSeek Harness.app' : ''))
const toolchain = path.resolve(arg('--toolchain', path.resolve(import.meta.dirname, '..', '..')))
const logDir = isMac
  ? path.join(os.homedir(), 'Library', 'Logs', 'dsh-desktop-profiles')
  : path.join(process.env.LOCALAPPDATA ?? os.homedir(), 'dsh-desktop-profiles')
const logFile = arg('--log', path.join(logDir, 'repair.log'))
const quiet = args.includes('--quiet')

fs.mkdirSync(logDir, { recursive: true })
function log(message) {
  const line = '[' + new Date().toISOString() + '] ' + message
  try {
    if (fs.existsSync(logFile) && fs.statSync(logFile).size > 512 * 1024) fs.renameSync(logFile, logFile + '.1')
    fs.appendFileSync(logFile, line + '\n')
  } catch {}
  if (!quiet) console.log(line)
}
function notify(title, message) {
  if (isMac) {
    try { spawnSync('osascript', ['-e', 'display notification "' + message.replace(/"/g, '\\"') + '" with title "' + title.replace(/"/g, '\\"') + '"'], { stdio: 'ignore' }) } catch {}
  }
}

const resources = isMac ? path.join(app, 'Contents', 'Resources') : path.join(app, 'resources')
const asarPath = path.join(resources, 'app.asar')
const markerPath = path.join(resources, 'dsh-profile-patch.json')

function findEntry(tree, rel) {
  let node = tree
  for (const part of rel.split('/')) {
    node = node?.files?.[part]
    if (node === undefined) return undefined
  }
  return node
}
function asarInfo(file) {
  const archive = readArchive(file)
  try {
    const main = findEntry(archive.tree, 'lib/main.js')
    const profiles = findEntry(archive.tree, 'lib/profiles.js')
    return {
      mainHash: main === undefined ? undefined : createHash('sha256').update(readEntry(archive, main)).digest('hex'),
      patched: profiles !== undefined
    }
  } finally {
    fs.closeSync(archive.fd)
  }
}
function appVersion() {
  if (!isMac) return undefined
  const plist = path.join(app, 'Contents', 'Info.plist')
  const result = spawnSync('plutil', ['-extract', 'CFBundleShortVersionString', 'raw', plist], { encoding: 'utf8' })
  return result.status === 0 ? result.stdout.trim() : undefined
}

/** Decide whether the installed bundle still carries the patch. */
function inspect() {
  if (!fs.existsSync(asarPath)) return { repair: false, reason: 'app.asar not found: ' + asarPath }
  if (!fs.existsSync(markerPath)) return { repair: true, reason: 'patch marker missing (DSH update replaced app.asar)' }
  let marker
  try { marker = JSON.parse(fs.readFileSync(markerPath, 'utf8')) } catch { return { repair: true, reason: 'patch marker unreadable' } }
  let info
  try { info = asarInfo(asarPath) } catch (error) { return { repair: false, reason: 'app.asar unreadable: ' + String(error) } }
  if (info.mainHash === marker.stockMainSha256) return { repair: true, reason: 'app.asar is the stock archive again (marker is stale)' }
  if (!info.patched) return { repair: true, reason: 'app.asar no longer contains lib/profiles.js' }
  const version = appVersion()
  if (version !== undefined && marker.desktopVersion !== undefined && marker.desktopVersion !== version) {
    return { repair: true, reason: 'patch built for ' + marker.desktopVersion + ', app is ' + version }
  }
  return { repair: false, reason: 'patch active for DSH ' + (version ?? marker.desktopVersion) }
}

function acquireLock() {
  const lock = path.join(toolchain, '.repair.lock')
  try {
    fs.mkdirSync(lock)
    fs.writeFileSync(path.join(lock, 'pid'), String(process.pid))
    return lock
  } catch {
    try {
      const age = Date.now() - fs.statSync(lock).mtimeMs
      if (age > 5 * 60 * 1000) { fs.rmSync(lock, { recursive: true, force: true }); return acquireLock() }
    } catch {}
    return undefined
  }
}

const state = inspect()
if (!state.repair && !args.includes('--force')) {
  if (args.includes('--verbose')) log('inspect: ' + state.reason)
  process.exit(0)
}
log('inspect: ' + state.reason)

const lock = acquireLock()
if (lock === undefined) { log('another repair is running; skipping'); process.exit(0) }

try {
  const beforeVersion = appVersion()
  const command = isMac ? path.join(toolchain, 'macos', 'install.command') : undefined
  const result = isMac
    ? spawnSync('/bin/bash', [command, app, '--no-quit', '--no-open', '--no-agent'], { encoding: 'utf8' })
    : spawnSync(process.execPath, [path.join(toolchain, 'windows', 'installer', 'repair-build.mjs'), '--install', app, '--toolchain', toolchain], { encoding: 'utf8' })
  const output = ((result.stdout ?? '') + (result.stderr ?? '')).trim()
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) {
    log('repair failed (exit ' + String(result.status) + ')' + (output === '' ? '' : '\n' + output.slice(-4000)))
    notify('DSH Desktop Profiles', '自动修复失败，详见 ' + logFile)
    process.exit(0)
  }
  const after = inspect()
  if (after.repair) {
    log('repair ran but the patch is still missing: ' + after.reason)
    notify('DSH Desktop Profiles', '自动修复未完成，详见 ' + logFile)
    process.exit(0)
  }
  const version = after.reason.replace(/^patch active for DSH /, '')
  log('repaired for DSH ' + version + (beforeVersion === undefined ? '' : ' (was ' + beforeVersion + ')'))
  notify('DSH Desktop Profiles', '检测到 DSH 更新，补丁已自动重打；重启应用后生效')
} catch (error) {
  log('repair error: ' + String(error))
  notify('DSH Desktop Profiles', '自动修复异常，详见 ' + logFile)
} finally {
  fs.rmSync(lock, { recursive: true, force: true })
}
process.exit(0)
