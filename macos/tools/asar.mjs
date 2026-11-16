// asar archive reader/writer for DSH desktop patching.
// Usage (pure Node, no asar support needed):
//   node asar.mjs info <asar>
//   node asar.mjs extract <asar> <outDir>
//   node asar.mjs repack --orig <asar> --out <asar> [--replace rel=path ...] [--add rel=path ...]
//   node asar.mjs verify <asar>
//   node asar.mjs dump-header <asar> <out.json>

import fs from 'node:fs'
import path from 'node:path'

const posix = (p) => p.split(path.sep).join('/')

export function readArchive(file) {
  const fd = fs.openSync(file, 'r')
  try {
    const prefix = Buffer.alloc(8)
    fs.readSync(fd, prefix, 0, 8, 0)
    const marker = prefix.readUInt32LE(0)
    if (marker !== 4) throw new Error(`asar: unexpected prefix ${marker}`)
    const headerLength = prefix.readUInt32LE(4)
    const header = Buffer.alloc(headerLength)
    fs.readSync(fd, header, 0, headerLength, 8)
    const payloadSize = header.readUInt32LE(0)
    if (payloadSize + 4 !== headerLength) throw new Error(`asar: header pickle mismatch ${payloadSize} vs ${headerLength}`)
    const jsonLength = header.readUInt32LE(4)
    if (jsonLength + 8 > headerLength) throw new Error('asar: json length out of range')
    const json = header.subarray(8, 8 + jsonLength).toString('utf8')
    const tree = JSON.parse(json)
    return {
      fd, file, headerLength, jsonLength, dataOffset: 8 + headerLength,
      totalSize: fs.fstatSync(fd).size, tree, json,
    }
  } catch (error) {
    try { fs.closeSync(fd) } catch {}
    throw error
  }
}

function walkFiles(node, prefix, visit) {
  for (const [name, entry] of Object.entries(node.files ?? {})) {
    const rel = prefix === '' ? name : `${prefix}/${name}`
    if (entry.files !== undefined) {
      visit(rel, entry, true)
      walkFiles(entry, rel, visit)
    } else {
      visit(rel, entry, false)
    }
  }
}

export function stats(archive) {
  let files = 0, dirs = 0, unpacked = 0, links = 0, bytes = 0
  let maxEnd = 0
  walkFiles(archive.tree, '', (rel, entry, isDir) => {
    if (isDir) { dirs++; return }
    files++
    if (entry.unpacked) { unpacked++; return }
    if (entry.link) { links++; return }
    bytes += entry.size
    maxEnd = Math.max(maxEnd, Number(entry.offset) + entry.size)
  })
  return { files, dirs, unpacked, links, bytes, maxEnd, dataLength: archive.totalSize - archive.dataOffset }
}

export function readEntry(archive, entry) {
  const buf = Buffer.alloc(entry.size)
  fs.readSync(archive.fd, buf, 0, entry.size, archive.dataOffset + Number(entry.offset))
  return buf
}

export function extract(archive, outDir) {
  let count = 0
  walkFiles(archive.tree, '', (rel, entry, isDir) => {
    const target = path.join(outDir, ...rel.split('/'))
    if (isDir) { fs.mkdirSync(target, { recursive: true }); return }
    fs.mkdirSync(path.dirname(target), { recursive: true })
    if (entry.link !== undefined) return
    if (entry.unpacked) {
      const unpackedPath = path.join(path.dirname(archive.file), path.basename(archive.file) + '.unpacked', ...rel.split('/'))
      fs.copyFileSync(unpackedPath, target)
    } else {
      fs.writeFileSync(target, readEntry(archive, entry))
    }
    count++
  })
  return count
}

function setPath(root, rel, value) {
  const parts = rel.split('/')
  let node = root
  for (let i = 0; i < parts.length - 1; i++) {
    node.files ??= {}
    const next = node.files[parts[i]]
    if (next === undefined || next.files === undefined) throw new Error(`asar: missing directory for ${rel}`)
    node = next
  }
  node.files ??= {}
  node.files[parts[parts.length - 1]] = value
}

function getPath(root, rel) {
  const parts = rel.split('/')
  let node = root
  for (let i = 0; i < parts.length; i++) {
    if (node?.files === undefined) return undefined
    node = node.files[parts[i]]
    if (node === undefined) return undefined
  }
  return node
}

function ensureDir(root, rel) {
  if (rel === '') return
  const parts = rel.split('/')
  let node = root
  for (const part of parts) {
    node.files ??= {}
    if (node.files[part] === undefined) node.files[part] = { files: {} }
    node = node.files[part]
    if (node.files === undefined) throw new Error(`asar: ${rel} collides with a file`)
  }
}

export function repack({ orig, out, replacements = {}, additions = {} }) {
  const archive = readArchive(orig)
  const tree = JSON.parse(archive.json)
  const original = new Map()
  walkFiles(tree, '', (rel, entry, isDir) => {
    if (isDir || entry.link !== undefined || entry.unpacked) return
    original.set(rel, { offset: Number(entry.offset), size: entry.size })
  })

  for (const [rel, file] of Object.entries(replacements)) {
    const entry = getPath(tree, rel)
    if (entry === undefined || entry.files !== undefined) throw new Error(`asar: no file entry ${rel}`)
    entry.size = fs.statSync(file).size
    if (entry.integrity !== undefined) delete entry.integrity
  }
  for (const [rel, file] of Object.entries(additions)) {
    const parts = rel.split('/')
    const parentRel = parts.slice(0, -1).join('/')
    ensureDir(tree, parentRel)
    const parent = parentRel === '' ? tree : getPath(tree, parentRel)
    parent.files ??= {}
    const name = parts[parts.length - 1]
    if (parent.files[name] !== undefined) throw new Error(`asar: ${rel} already exists`)
    parent.files[name] = { size: fs.statSync(file).size }
  }

  return writeArchive({ tree, original, origArchive: archive, out, replacements, additions })
}

function writeArchive({ tree, original, origArchive, out, replacements, additions }) {
  // Pass 1: assign offsets (tree order); patched files use their on-disk size.
  let offset = 0
  const order = []
  walkFiles(tree, '', (rel, entry, isDir) => {
    if (isDir || entry.link !== undefined || entry.unpacked) return
    const source = replacements[rel] ?? additions[rel]
    if (source !== undefined) entry.size = fs.statSync(source).size
    entry.offset = String(offset)
    offset += entry.size
    order.push({ rel, size: entry.size, source })
  })

  const json = JSON.stringify(tree)
  const jsonBuf = Buffer.from(json, 'utf8')
  const payloadLength = 4 + jsonBuf.length
  const pad = (4 - (payloadLength % 4)) % 4
  const payload = Buffer.alloc(payloadLength + pad)
  payload.writeUInt32LE(jsonBuf.length, 0)
  jsonBuf.copy(payload, 4)
  const header = Buffer.alloc(4 + payload.length)
  header.writeUInt32LE(payload.length, 0)
  payload.copy(header, 4)
  const prefix = Buffer.alloc(8)
  prefix.writeUInt32LE(4, 0)
  prefix.writeUInt32LE(header.length, 4)

  const fd = fs.openSync(out, 'w')
  try {
    fs.writeSync(fd, prefix)
    fs.writeSync(fd, header)
    const block = Buffer.alloc(1 << 20)
    for (const item of order) {
      if (item.source !== undefined) {
        fs.writeSync(fd, fs.readFileSync(item.source))
        continue
      }
      const origin = original.get(item.rel)
      if (origin === undefined) throw new Error(`asar: lost original entry ${item.rel}`)
      let remaining = origin.size
      let source = origArchive.dataOffset + origin.offset
      while (remaining > 0) {
        const want = Math.min(remaining, block.length)
        fs.readSync(origArchive.fd, block, 0, want, source)
        fs.writeSync(fd, block, 0, want)
        source += want
        remaining -= want
      }
    }
    fs.fsyncSync(fd)
    const written = fs.fstatSync(fd).size
    const expected = 8 + header.length + offset
    if (written !== expected) throw new Error(`asar: size mismatch ${written} != ${expected}`)
    return { out, entries: order.length, bytes: written, dataBytes: offset }
  } finally {
    fs.closeSync(fd)
    fs.closeSync(origArchive.fd)
  }
}

export function verify(archivePath) {
  const archive = readArchive(archivePath)
  const stat = stats(archive)
  const problems = []
  if (stat.maxEnd > stat.dataLength) problems.push(`data out of range: ${stat.maxEnd} > ${stat.dataLength}`)
  if (stat.maxEnd !== stat.dataLength) problems.push(`trailing gap: ${stat.dataLength - stat.maxEnd}`)
  return { ...stat, problems }
}

if (import.meta.main) {
  const [command, ...rest] = process.argv.slice(2)
  const log = (value) => process.stdout.write(`${typeof value === 'string' ? value : JSON.stringify(value, null, 2)}\n`)
  if (command === 'info') {
    const archive = readArchive(rest[0])
    log({ file: archive.file, dataOffset: archive.dataOffset, ...stats(archive) })
  } else if (command === 'extract') {
    const archive = readArchive(rest[0])
    log({ extracted: extract(archive, rest[1]) })
  } else if (command === 'verify') {
    log(verify(rest[0]))
  } else if (command === 'repack') {
    const args = { replacements: {}, additions: {} }
    for (let i = 0; i < rest.length; i++) {
      const head = rest[i]
      if (head === '--orig') args.orig = rest[++i]
      else if (head === '--out') args.out = rest[++i]
      else if (head === '--replace') { const [rel, file] = rest[++i].split('='); args.replacements[rel] = file }
      else if (head === '--add') { const [rel, file] = rest[++i].split('='); args.additions[rel] = file }
      else throw new Error(`unknown argument ${head}`)
    }
    log(repack(args))
  } else if (command === 'dump-header') {
    const archive = readArchive(rest[0])
    fs.writeFileSync(rest[1], archive.json)
    log({ jsonLength: archive.jsonLength, headerLength: archive.headerLength, out: rest[1] })
  } else {
    throw new Error(`unknown command ${command}`)
  }
}
