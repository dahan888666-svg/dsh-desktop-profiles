// Self-healing check used by Launch.cmd / Repair.cmd.
//
// - Patched archive present: nothing to do.
// - Stock archive matching a bundled payload (default or per-version): apply it.
// - Any other DSH build: fail open (leave the app untouched) and record a notice.
//
// Always exits 0 so a launch is never blocked by this step.
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { readArchive, readEntry } from './asar.mjs'
import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const installDir = path.resolve(args.find((value) => !value.startsWith('--')) ?? 'D:\\DSH')
const payloadIndex = args.indexOf('--payload')
const defaultPayload = payloadIndex === -1 ? path.resolve(import.meta.dirname, '..', 'payload') : path.resolve(args[payloadIndex + 1])
const verbose = !args.includes('--quiet')
const resources = path.join(installDir, 'resources')
const asarPath = path.join(resources, 'app.asar')
const logDir = path.join(process.env.LOCALAPPDATA ?? process.env.TEMP ?? '.', 'dsh-desktop-profiles')
const logPath = path.join(logDir, 'repair.log')

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`
  try {
    fs.mkdirSync(logDir, { recursive: true })
    fs.appendFileSync(logPath, `${line}\n`)
  } catch {}
  if (verbose) console.log(message)
}

function findEntry(tree, rel) {
  let node = tree
  for (const part of rel.split('/')) {
    node = node?.files?.[part]
    if (node === undefined) return undefined
  }
  return node
}

function inspect(asar) {
  const archive = readArchive(asar)
  try {
    const versionEntry = findEntry(archive.tree, 'package.json')
    const mainEntry = findEntry(archive.tree, 'lib/main.js')
    const version = versionEntry === undefined ? undefined : JSON.parse(readEntry(archive, versionEntry).toString('utf8')).version
    const mainHash = mainEntry === undefined ? undefined : createHash('sha256').update(readEntry(archive, mainEntry)).digest('hex')
    return { version, mainHash, patched: findEntry(archive.tree, 'lib/profiles.js') !== undefined }
  } finally {
    fs.closeSync(archive.fd)
  }
}

function readManifest(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, 'dsh-profile-patch.json'), 'utf8'))
  } catch {
    return undefined
  }
}

try {
  if (!fs.existsSync(asarPath)) {
    log(`app.asar not found at ${asarPath}; nothing to do`)
    process.exit(0)
  }
  const current = inspect(asarPath)
  if (current.patched) {
    if (verbose) log(`already patched (DSH ${current.version})`)
    process.exit(0)
  }

  // Default payload, then a per-version payload shipped later by a release.
  const candidates = [defaultPayload]
  if (current.version !== undefined) candidates.push(path.resolve(defaultPayload, '..', 'payload-versions', current.version))
  const match = candidates.find((dir) => {
    const manifest = readManifest(dir)
    return manifest !== undefined && manifest.desktopVersion === current.version && manifest.stockMainSha256 === current.mainHash
  })
  if (match === undefined) {
    log(`DSH ${current.version ?? 'unknown'} has no matching patch payload (default: ${current.version === undefined ? 'unknown' : 'see metadata'}); leaving it unpatched. Install a desktop-profiles release that supports this DSH version.`)
    process.exit(0)
  }

  log(`repairing DSH ${current.version} (${asarPath}) with ${match}`)
  const result = spawnSync(process.execPath, [path.join(import.meta.dirname, 'deploy.mjs'), installDir, '--payload', match, '--quiet'], { stdio: verbose ? 'inherit' : 'ignore' })
  if (result.status !== 0) {
    log(`repair failed with exit ${String(result.status)}; the app will start unpatched`)
    process.exit(0)
  }
  log('repaired')
} catch (error) {
  log(`check failed: ${String(error)}; the app will start unpatched`)
}
process.exit(0)
