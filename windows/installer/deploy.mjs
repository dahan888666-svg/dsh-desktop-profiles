// Installer entry for the distributable package.
// Usage: node deploy.mjs <installDir> [--payload <dir>] [--dry]
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { readArchive, readEntry, repack } from './asar.mjs'

const args = process.argv.slice(2)
const installDir = path.resolve(args.find((value, index) => !value.startsWith('--') && args[index - 1] !== '--payload') ?? 'D:\\DSH')
const payloadIndex = args.indexOf('--payload')
const payload = payloadIndex === -1 ? path.resolve(import.meta.dirname, '..', 'payload') : path.resolve(args[payloadIndex + 1])
const dry = args.includes('--dry')
const resources = path.join(installDir, 'resources')
const asarPath = path.join(resources, 'app.asar')
const stockPath = path.join(resources, 'app.asar.stock')
const manifest = JSON.parse(fs.readFileSync(path.join(payload, 'dsh-profile-patch.json'), 'utf8'))

if (!fs.existsSync(path.join(installDir, 'DeepSeek Harness.exe'))) throw new Error(`not a DeepSeek Harness installation: ${installDir}`)
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
  fs.copyFileSync(asarPath, stockPath)
  console.log(`stock archive saved: ${stockPath}`)
}
const stock = readArchive(stockPath)
const stockHash = hashEntry(stock, 'lib/main.js')
fs.closeSync(stock.fd)
if (stockHash !== manifest.stockMainSha256) throw new Error(`unsupported DSH build (lib/main.js hash ${stockHash}); this package targets ${manifest.desktopVersion}`)

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
console.log(`${hasPatch ? 'Updating' : 'Installing'} desktop profiles for ${installDir}`)
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
  throw new Error(`cannot replace app.asar (close DeepSeek Harness first): ${error.message}`)
}
try {
  renameWithRetry(newAsar, asarPath)
} catch (error) {
  try { renameWithRetry(previous, asarPath) } catch {}
  fs.rmSync(newAsar, { force: true })
  throw error
}
fs.copyFileSync(path.join(payload, 'dsh-profile-patch.json'), path.join(resources, 'dsh-profile-patch.json'))
console.log('installed; restart DeepSeek Harness to activate')

