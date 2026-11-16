// macOS installer entry: patch a DeepSeek Harness .app bundle.
// Usage: node deploy.mjs "/Applications/DeepSeek Harness.app" --payload <dir> [--dry]
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { readArchive, readEntry, repack } from './asar.mjs'
import { readSignatureState, releaseSignatureState, signApp, verifyApp, syncAsarIntegrity } from './macos-sign.mjs'

const args = process.argv.slice(2)
const target = path.resolve(args.find((value, index) => !value.startsWith('--') && args[index - 1] !== '--payload') ?? '/Applications/DeepSeek Harness.app')
const payloadIndex = args.indexOf('--payload')
const payload = payloadIndex === -1 ? path.resolve(import.meta.dirname, '..', 'payload') : path.resolve(args[payloadIndex + 1])
const dry = args.includes('--dry')

const isBundle = target.endsWith('.app')
const resources = isBundle ? path.join(target, 'Contents', 'Resources') : path.join(target, 'resources')
const asarPath = path.join(resources, 'app.asar')
const stockPath = path.join(resources, 'app.asar.stock')
const manifest = JSON.parse(fs.readFileSync(path.join(payload, 'dsh-profile-patch.json'), 'utf8'))

if (isBundle) {
  if (!fs.existsSync(path.join(target, 'Contents', 'MacOS'))) throw new Error(`not a macOS app bundle: ${target}`)
} else if (!fs.existsSync(path.join(target, 'DeepSeek Harness.exe'))) {
  throw new Error(`not a DeepSeek Harness installation: ${target}`)
}
if (!fs.existsSync(asarPath)) throw new Error(`app.asar not found: ${asarPath}`)

function findEntry(tree, rel) {
  let node = tree
  for (const part of rel.split('/')) {
    node = node?.files?.[part]
    if (node === undefined) return undefined
  }
  return node
}
function hashEntry(archive, rel) {
  const entry = findEntry(archive.tree, rel)
  return entry === undefined ? undefined : createHash('sha256').update(readEntry(archive, entry)).digest('hex')
}
function walk(dir, prefix = '') {
  const rows = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) rows.push(...walk(full, rel))
    else if (rel !== 'dsh-profile-patch.json') rows.push({ rel, full })
  }
  return rows
}

if (!fs.existsSync(stockPath)) {
  if (dry) throw new Error('stock archive is missing; run once without --dry')
  const probe = readArchive(asarPath)
  const alreadyPatched = findEntry(probe.tree, 'lib/profiles.js') !== undefined
  fs.closeSync(probe.fd)
  if (alreadyPatched) {
    throw new Error('app.asar is already patched but app.asar.stock is missing; reinstall DeepSeek Harness to restore a pristine archive, then install again')
  }
  fs.copyFileSync(asarPath, stockPath)
  console.log(`stock archive saved: ${stockPath}`)
}
const stock = readArchive(stockPath)
const stockHash = hashEntry(stock, 'lib/main.js')
fs.closeSync(stock.fd)
if (stockHash !== manifest.stockMainSha256) {
  throw new Error(`unsupported DSH build (lib/main.js hash ${stockHash}); rebuild the payload from this app.asar (tools/build.mjs)`)
}

// Capture the current signature before the bundle is touched: replacing
// app.asar invalidates it, so the ad-hoc replacement must reproduce exactly
// what it carried (hardened runtime and/or entitlements), not invent or drop
// anything. Nested helpers keep their own signatures either way.
const signature = isBundle && process.platform === 'darwin' ? readSignatureState(target) : undefined

const current = readArchive(asarPath)
const hasPatch = findEntry(current.tree, 'lib/profiles.js') !== undefined
fs.closeSync(current.fd)

const existing = new Set()
const collect = (node, prefix) => {
  for (const [name, entry] of Object.entries(node.files ?? {})) {
    const rel = prefix === '' ? name : `${prefix}/${name}`
    if (entry.files !== undefined) collect(entry, rel)
    else existing.add(rel)
  }
}
collect(stock.tree, '')
const replacements = {}
const additions = {}
for (const file of walk(payload)) {
  if (existing.has(file.rel)) replacements[file.rel] = file.full
  else additions[file.rel] = file.full
}
console.log(`${hasPatch ? 'Updating' : 'Installing'} desktop profiles for ${target}`)
console.log(`  replace ${Object.keys(replacements).length}, add ${Object.keys(additions).length}, DSH ${manifest.desktopVersion}`)
if (dry) process.exit(0)

const newAsar = path.join(resources, `app.asar.patched-${process.pid}`)
const result = repack({ orig: stockPath, out: newAsar, replacements, additions })
console.log(`  built archive (${result.bytes} bytes)`)
const previous = path.join(resources, 'app.asar.previous')

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
function renameWithRetry(from, to, attempts = 12) {
  let last
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      fs.renameSync(from, to)
      return
    } catch (error) {
      last = error
      if (error.code !== 'EBUSY' && error.code !== 'EPERM' && error.code !== 'EACCES') throw error
      sleep(500)
    }
  }
  throw last
}

try {
  if (fs.existsSync(previous)) fs.rmSync(previous, { force: true })
  renameWithRetry(asarPath, previous)
} catch (error) {
  fs.rmSync(newAsar, { force: true })
  throw new Error(`cannot replace app.asar (quit DeepSeek Harness first): ${error.message}`)
}
try {
  renameWithRetry(newAsar, asarPath)
} catch (error) {
  try { renameWithRetry(previous, asarPath) } catch {}
  fs.rmSync(newAsar, { force: true })
  throw error
}
fs.copyFileSync(path.join(payload, 'dsh-profile-patch.json'), path.join(resources, 'dsh-profile-patch.json'))

if (isBundle && process.platform === 'darwin') {
  // Replacing app.asar invalidates two things beyond the signature: the
  // ElectronAsarIntegrity hash in Info.plist, and the Developer ID seal. Update
  // the hash first, then ad-hoc sign with the entitlements captured above.
  // Sign the main bundle only: --deep would strip the nested helpers' original
  // signatures, and the hardened-runtime flag is preserved by signApp.
  syncAsarIntegrity(target)
  const signed = signApp(target, signature ?? { entitlements: undefined, runtime: false })
  releaseSignatureState(signature)
  if (signed) verifyApp(target)
}
console.log('installed; reopen DeepSeek Harness to activate')
