/**
 * Profile registry and on-disk layout for DSH Desktop.
 *
 * The default profile keeps the historical layout (home = `$DSH_HOME`, plugin
 * profile = `$DSH_HOME/profiles/desktop`). Every other profile owns a full
 * harness home under `$DSH_HOME/desktop-profiles/<slug>/home`, so sessions,
 * credentials, plugins and settings are isolated by directory.
 *
 * Pure Node: no Electron imports, so this file can be unit-tested directly.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

export const DEFAULT_PROFILE = 'desktop'
export const DEFAULT_LABEL = '默认'
export const REGISTRY_VERSION = 1
const SLUG = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

/** @param {unknown} name @returns {boolean} */
export function isValidProfileName(name) {
  return typeof name === 'string' && name.length >= 1 && name.length <= 24 && SLUG.test(name)
}

/** Directory holding non-default profiles. */
export function profileRoot(dshHome) {
  return join(dshHome, 'desktop-profiles')
}

/**
 * Resolve every path one profile owns.
 * @param {string} dshHome - harness home of the default profile.
 * @param {string} name - profile slug.
 * @returns {{ name: string, home: string, profile: string, lock: string, base?: string }}
 */
export function profilePaths(dshHome, name) {
  const root = resolve(dshHome)
  if (name === DEFAULT_PROFILE) {
    const profile = join(root, 'profiles', DEFAULT_PROFILE)
    return { name, home: root, profile, lock: join(profile, 'lock') }
  }
  const base = join(profileRoot(root), name)
  const home = join(base, 'home')
  const profile = join(home, 'profiles', DEFAULT_PROFILE)
  return { name, home, profile, lock: join(profile, 'lock'), base }
}

/** Read `--profile <name>` / `--profile=<name>` from a launch argument list. */
export function parseProfileArg(argv) {
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (typeof value !== 'string') continue
    if (value.startsWith('--profile=')) return value.slice('--profile='.length)
    if (value !== '--profile') continue
    // Electron appends Chromium switches between `--profile` and its value in
    // second-instance argv, so take the first following non-switch argument.
    for (let next = index + 1; next < argv.length; next += 1) {
      const candidate = argv[next]
      if (typeof candidate !== 'string' || candidate === '') continue
      if (candidate.startsWith('-')) continue
      return candidate
    }
    return undefined
  }
  return undefined
}

function emptyRegistry() {
  return { schemaVersion: REGISTRY_VERSION, lastProfile: DEFAULT_PROFILE, profiles: [] }
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return undefined
  }
}

/** Atomic JSON write in the destination directory. */
function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true })
  const temporary = `${path}.${process.pid}.tmp`
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`)
  renameSync(temporary, path)
}

export class ProfileStore {
  /**
   * @param {string} dshHome - harness home (default profile home).
   */
  constructor(dshHome) {
    this.dshHome = resolve(dshHome)
    this.root = profileRoot(this.dshHome)
    this.file = join(this.root, 'registry.json')
  }

  /** Create the registry directory and a first document when missing. */
  ensure() {
    mkdirSync(this.root, { recursive: true })
    if (!existsSync(this.file)) writeJson(this.file, emptyRegistry())
  }

  read() {
    const value = readJson(this.file)
    if (typeof value !== 'object' || value === null || !Array.isArray(value.profiles)) return emptyRegistry()
    return {
      schemaVersion: REGISTRY_VERSION,
      lastProfile: typeof value.lastProfile === 'string' ? value.lastProfile : DEFAULT_PROFILE,
      profiles: value.profiles.filter((entry) => typeof entry?.name === 'string' && entry.name !== DEFAULT_PROFILE)
    }
  }

  list() {
    const registry = this.read()
    const rows = registry.profiles.map((entry) => ({
      name: entry.name,
      label: typeof entry.label === 'string' && entry.label !== '' ? entry.label : entry.name,
      createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : undefined,
      builtin: false
    }))
    return [{ name: DEFAULT_PROFILE, label: DEFAULT_LABEL, builtin: true }, ...rows]
  }

  get(name) {
    return this.list().find((entry) => entry.name === name)
  }

  setLast(name) {
    const registry = this.read()
    registry.lastProfile = name
    const entry = registry.profiles.find((row) => row.name === name)
    if (entry !== undefined) entry.lastUsedAt = new Date().toISOString()
    writeJson(this.file, registry)
  }

  add({ name, label, createdAt }) {
    const registry = this.read()
    if (registry.profiles.some((entry) => entry.name === name)) throw new Error('profile exists')
    registry.profiles.push({ name, label, createdAt: createdAt ?? new Date().toISOString() })
    registry.lastProfile = name
    writeJson(this.file, registry)
  }

  remove(name) {
    const registry = this.read()
    registry.profiles = registry.profiles.filter((entry) => entry.name !== name)
    if (registry.lastProfile === name) registry.lastProfile = DEFAULT_PROFILE
    writeJson(this.file, registry)
  }

  rename(name, label) {
    const registry = this.read()
    const entry = registry.profiles.find((row) => row.name === name)
    if (entry === undefined) throw new Error('unknown profile')
    entry.label = label
    writeJson(this.file, registry)
  }
}

/**
 * Pick the profile this launch belongs to.
 * Precedence: `--profile`, `$DSH_DESKTOP_PROFILE`, registry lastProfile, default.
 */
export function resolveStartupProfile(store, argv, env = process.env) {
  const requested = parseProfileArg(argv) ?? (typeof env.DSH_DESKTOP_PROFILE === 'string' && env.DSH_DESKTOP_PROFILE !== '' ? env.DSH_DESKTOP_PROFILE : undefined)
  if (requested !== undefined && store.get(requested) !== undefined) return requested
  const last = store.read().lastProfile
  if (store.get(last) !== undefined) return last
  return DEFAULT_PROFILE
}

/** Extract selected loader patch entries (`- id: <id>`) from a patch file. */
function extractRows(text, ids) {
  const lines = text.split(/\r?\n/)
  const rows = []
  for (const id of ids) {
    const start = lines.findIndex((line) => new RegExp(`^-\\s+id:\\s*["']?${id}(?:["']|\\s|$)`).test(line))
    if (start === -1) continue
    let end = lines.length
    for (let index = start + 1; index < lines.length; index += 1) {
      if (/^-\s+id:/.test(lines[index])) { end = index; break }
    }
    rows.push(lines.slice(start, end).join('\n').trimEnd())
  }
  return rows.length === 0 ? '' : `${rows.join('\n')}\n`
}

/**
 * Materialize a new profile: home, plugin profile skeleton, credentials and model row.
 * @param {object} options
 * @param {ProfileStore} options.store
 * @param {string} options.dshHome
 * @param {string} options.name
 * @param {string} options.label
 * @param {string[]} options.bundles - bundle names taken from the packaged desktop profile.
 * @param {(dir: string, bundles: string[]) => void} options.initProfile
 * @param {boolean} options.copyCredentials
 * @param {boolean} options.copyModelPatch
 * @param {{ home: string, profile: string }} options.source - currently active profile.
 */
export function createProfileFiles(options) {
  const { store, dshHome, name, label, bundles, initProfile, copyCredentials, copyModelPatch, source } = options
  if (!isValidProfileName(name)) throw new Error('invalid-profile-name')
  if (store.get(name) !== undefined) throw new Error('profile-exists')
  const paths = profilePaths(dshHome, name)
  if (existsSync(paths.base)) throw new Error('profile-directory-exists')

  mkdirSync(paths.home, { recursive: true })
  initProfile(paths.profile, bundles)

  if (copyCredentials) {
    for (const fileName of ['.credentials.yaml', '.env']) {
      const from = join(source.home, fileName)
      if (existsSync(from)) copyFileSync(from, join(paths.home, fileName))
    }
  }

  if (copyModelPatch) {
    try {
      const sourcePatch = join(source.profile, 'cordis.patch.yml')
      const targetPatch = join(paths.profile, 'cordis.patch.yml')
      if (existsSync(sourcePatch) && existsSync(targetPatch)) {
        const row = extractRows(readFileSync(sourcePatch, 'utf8'), ['agent-default-model', 'ui-settings-account'])
        if (row !== '') {
          const targetText = readFileSync(targetPatch, 'utf8')
          const lines = targetText.split(/\r?\n/)
          const body = lines.filter((line) => !line.trim().startsWith('#')).join('\n').trim()
          const header = lines.filter((line) => line.trim().startsWith('#')).join('\n')
          const next = body === '' || body === '[]'
            ? `${header}${header === '' ? '' : '\n'}${row}`
            : `${targetText.trimEnd()}\n${row}`
          writeFileSync(targetPatch, next)
        }
      }
    } catch (error) {
      console.warn('desktop profiles: model patch copy skipped', error)
    }
  }

  const createdAt = new Date().toISOString()
  writeJson(join(paths.base, 'meta.json'), { schemaVersion: 1, name, label, createdAt, home: 'home' })
  store.add({ name, label, createdAt })
  return { name, label, createdAt }
}

/** Move a profile out of the way, keeping its data recoverable. */
export function trashProfile(dshHome, name) {
  const paths = profilePaths(dshHome, name)
  if (paths.base === undefined || !existsSync(paths.base)) return undefined
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const target = join(profileRoot(dshHome), '.trash', `${stamp}-${name}`)
  mkdirSync(dirname(target), { recursive: true })
  renameSync(paths.base, target)
  return target
}

/** Remove stale temporary registry files left by an interrupted write. */
export function cleanRegistryTemps(dshHome) {
  const root = profileRoot(dshHome)
  if (!existsSync(root)) return
  try {
    for (const entry of readdirSync(root)) {
      if (entry.endsWith('.tmp')) rmSync(join(root, entry), { force: true })
    }
  } catch {}
}
