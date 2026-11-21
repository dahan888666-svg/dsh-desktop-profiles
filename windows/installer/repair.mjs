#!/usr/bin/env node
// Rebuild and reinstall the Desktop Profiles patch on Windows.
//
// Used by Launch.cmd / Repair.cmd (before the app starts) and by the startup
// watcher after a DeepSeek Harness update replaced app.asar. The patch is
// rebuilt from the app's own asar, so a new DSH version is handled without a
// new release as long as the shell anchors still exist.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const arg = (name, fallback) => {
  const index = args.indexOf(name)
  return index === -1 || args[index + 1] === undefined ? fallback : args[index + 1]
}
const quiet = args.includes('--quiet')
const toolchain = path.resolve(arg('--toolchain', path.resolve(import.meta.dirname, '..', '..')))
const logDir = path.join(process.env.LOCALAPPDATA ?? os.homedir(), 'dsh-desktop-profiles')
const logFile = path.join(logDir, 'repair.log')
const stopFile = path.join(logDir, 'STOP')

fs.mkdirSync(logDir, { recursive: true })
function log(message) {
  const line = '[' + new Date().toISOString() + '] ' + message
  try {
    if (fs.existsSync(logFile) && fs.statSync(logFile).size > 512 * 1024) fs.renameSync(logFile, logFile + '.1')
    fs.appendFileSync(logFile, line + '\n')
  } catch {}
  if (!quiet) console.log(line)
}

function detectInstallDir() {
  const explicit = args.find((value, index) => !value.startsWith('--') && args[index - 1] !== '--toolchain')
  const candidates = [
    explicit,
    'D:\\DSH',
    path.join(process.env.LOCALAPPDATA ?? '', 'Programs', 'DeepSeek Harness'),
    path.join(process.env.ProgramFiles ?? '', 'DeepSeek Harness'),
    path.join(process.env['ProgramFiles(x86)'] ?? '', 'DeepSeek Harness')
  ].filter((value) => typeof value === 'string' && value !== '')
  return candidates.find((candidate) => fs.existsSync(path.join(candidate, 'DeepSeek Harness.exe')))
}

function findEntry(tree, rel) {
  let node = tree
  for (const part of rel.split('/')) {
    node = node?.files?.[part]
    if (node === undefined) return undefined
  }
  return node
}

async function inspect(installDir) {
  const resources = path.join(installDir, 'resources')
  const asar = path.join(resources, 'app.asar')
  const markerPath = path.join(resources, 'dsh-profile-patch.json')
  if (!fs.existsSync(asar)) return { repair: false, reason: 'app.asar not found' }
  const { readArchive, readEntry } = await import(pathToFileURL(path.join(toolchain, 'macos', 'tools', 'asar.mjs')).href)
  const archive = readArchive(asar)
  let info
  try {
    const main = findEntry(archive.tree, 'lib/main.js')
    info = {
      mainHash: main === undefined ? undefined : createHash('sha256').update(readEntry(archive, main)).digest('hex'),
      patched: findEntry(archive.tree, 'lib/profiles.js') !== undefined
    }
  } finally {
    fs.closeSync(archive.fd)
  }
  if (!fs.existsSync(markerPath)) return { repair: true, reason: 'patch marker missing', info }
  let marker
  try { marker = JSON.parse(fs.readFileSync(markerPath, 'utf8')) } catch { return { repair: true, reason: 'patch marker unreadable', info } }
  if (info.mainHash === marker.stockMainSha256) return { repair: true, reason: 'app.asar is the stock archive again', info }
  if (!info.patched) return { repair: true, reason: 'lib/profiles.js missing', info }
  return { repair: false, reason: 'patch active for DSH ' + marker.desktopVersion, info }
}

function appNode(installDir) {
  const candidate = path.join(installDir, 'resources', 'runtime', 'primary-runtime', 'dependencies', 'node', 'bin', 'node.exe')
  return fs.existsSync(candidate) ? candidate : process.execPath
}

async function main() {
  if (fs.existsSync(stopFile)) { log('stop flag present; skipping'); return 0 }
  const installDir = detectInstallDir()
  if (installDir === undefined) { log('DeepSeek Harness not found; skipping'); return 0 }
  const state = await inspect(installDir)
  if (!state.repair) {
    if (args.includes('--verbose')) log('inspect: ' + state.reason)
    return 0
  }
  log('inspect: ' + state.reason)
  if (state.info !== undefined && state.info.patched) {
    log('app.asar is already patched but the marker is inconsistent; leaving it untouched')
    return 0
  }
  const resources = path.join(installDir, 'resources')
  const stock = path.join(resources, 'app.asar.stock')
  const asar = path.join(resources, 'app.asar')
  const source = fs.existsSync(stock) ? stock : asar
  const node = appNode(installDir)
  const build = spawnSync(node, [path.join(toolchain, 'macos', 'tools', 'build.mjs'), path.join(toolchain, 'macos'), source], { encoding: 'utf8', cwd: path.join(toolchain, 'macos') })
  const buildOutput = ((build.stdout ?? '') + (build.stderr ?? '')).trim()
  if (build.status !== 0) {
    log('build failed (exit ' + String(build.status) + ')\n' + buildOutput.slice(-4000))
    return 0
  }
  const deploy = spawnSync(node, [path.join(toolchain, 'windows', 'installer', 'deploy.mjs'), installDir, '--payload', path.join(toolchain, 'macos', 'build', 'app')], { encoding: 'utf8' })
  const deployOutput = ((deploy.stdout ?? '') + (deploy.stderr ?? '')).trim()
  if (deploy.status !== 0) {
    log('deploy failed (exit ' + String(deploy.status) + ')\n' + deployOutput.slice(-4000))
    return 0
  }
  log('repaired for ' + installDir + '\n' + deployOutput.slice(-2000))
  return 0
}

main().then((code) => process.exit(code)).catch((error) => { log('repair error: ' + String(error)); process.exit(0) })
