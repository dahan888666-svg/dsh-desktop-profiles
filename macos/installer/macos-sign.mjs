// Shared macOS helpers for patching a DeepSeek Harness .app bundle.
//
// Replacing `Contents/Resources/app.asar` invalidates two things beyond the
// code signature itself:
//   1. the ElectronAsarIntegrity hash Electron records in Info.plist, and
//   2. the bundle's Developer ID seal (so the app must be ad-hoc re-signed).
//
// This module keeps those steps in one place so deploy.mjs and revert.mjs
// behave identically. Signing is deliberately faithful to the bundle it
// replaces: when the current signature is hardened and carries entitlements
// (JIT / unsigned executable memory / library validation / audio input), the
// ad-hoc signature keeps both; when it carries neither (e.g. an app already
// re-signed ad-hoc by 0.1.2), nothing is invented. Nested frameworks and
// helpers are never re-signed, so their Developer ID signatures stay valid.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'

const PLIST_BUDDY = '/usr/libexec/PlistBuddy'

/** SHA-256 of a file, lowercase hex. */
export function sha256File(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

/**
 * Read the bundle's current entitlements into a temporary plist.
 * @param {string} appDir - the .app bundle.
 * @returns {string | undefined} path to the temporary plist, or undefined when the bundle has none.
 */
export function readEntitlements(appDir) {
  const result = spawnSync('codesign', ['-d', '--entitlements', ':-', appDir], { encoding: 'utf8' })
  const xml = (result.stdout ?? '').trim()
  if (!xml.startsWith('<?xml')) return undefined
  const file = path.join(os.tmpdir(), `dsh-profiles-entitlements-${process.pid}.plist`)
  fs.writeFileSync(file, xml)
  return file
}

/**
 * What the bundle's current signature carries, so the replacement can match it.
 * @param {string} appDir - the .app bundle.
 * @returns {{ entitlements: string | undefined, runtime: boolean }}
 */
export function readSignatureState(appDir) {
  const entitlements = readEntitlements(appDir)
  const detail = spawnSync('codesign', ['-d', '--verbose=2', appDir], { encoding: 'utf8' })
  const flags = /flags=0x[0-9a-f]+\(([^)]*)\)/i.exec(detail.stderr ?? '')
  const runtime = flags !== null && flags[1].split(',').map((part) => part.trim()).includes('runtime')
  return { entitlements, runtime }
}

/** Release a temporary entitlements file created by readSignatureState. */
export function releaseSignatureState(state) {
  if (state?.entitlements !== undefined) fs.rmSync(state.entitlements, { force: true })
}

/**
 * Ad-hoc sign the main bundle, preserving the runtime flag and entitlements.
 * Never uses --deep: that would strip the nested helpers' own signatures.
 * @param {string} appDir - the .app bundle.
 * @param {{ entitlements: string | undefined, runtime: boolean }} state
 * @returns {boolean} whether codesign succeeded.
 */
export function signApp(appDir, state) {
  const args = ['--force', '--sign', '-']
  if (state.runtime) args.push('--options', 'runtime')
  if (state.entitlements !== undefined) args.push('--entitlements', state.entitlements)
  args.push(appDir)
  const result = spawnSync('codesign', args, { stdio: 'inherit' })
  if (result.error !== undefined) {
    console.warn(`codesign unavailable: ${String(result.error)}`)
    return false
  }
  if (result.status !== 0) {
    console.warn('codesign failed; if macOS reports a damaged app, run: sudo xattr -dr com.apple.quarantine "' + appDir + '"')
    return false
  }
  console.log(`  signed ad-hoc${state.runtime ? ' (hardened runtime)' : ''}${state.entitlements === undefined ? '' : ' with its original entitlements'}`)
  return true
}

/** Verify the bundle's signature; returns whether it is valid. */
export function verifyApp(appDir) {
  const result = spawnSync('codesign', ['--verify', '--verbose=1', appDir], { stdio: 'inherit' })
  return result.status === 0
}

/**
 * Point Info.plist's ElectronAsarIntegrity at the current app.asar.
 * Electron records a hash there; leaving it stale makes updated builds warn
 * (or refuse, when the integrity fuse is enabled).
 * @param {string} appDir - the .app bundle.
 * @returns {boolean} whether the hash was updated or already correct.
 */
export function syncAsarIntegrity(appDir) {
  const plist = path.join(appDir, 'Contents', 'Info.plist')
  const asar = path.join(appDir, 'Contents', 'Resources', 'app.asar')
  if (!fs.existsSync(plist) || !fs.existsSync(asar)) return false
  const keyPath = 'ElectronAsarIntegrity:Resources/app.asar:hash'
  const probe = spawnSync(PLIST_BUDDY, ['-c', `Print :${keyPath}`, plist], { encoding: 'utf8' })
  if (probe.status !== 0) {
    console.warn('Info.plist has no ElectronAsarIntegrity entry for app.asar; skipping the hash update')
    return false
  }
  const hash = sha256File(asar)
  if (probe.stdout.trim() === hash) {
    console.log('  ElectronAsarIntegrity already matches the archive')
    return true
  }
  const set = spawnSync(PLIST_BUDDY, ['-c', `Set :${keyPath} ${hash}`, plist], { stdio: 'inherit' })
  if (set.status !== 0) {
    console.warn('could not update ElectronAsarIntegrity; Electron may warn about the archive')
    return false
  }
  console.log('  ElectronAsarIntegrity hash updated')
  return true
}
