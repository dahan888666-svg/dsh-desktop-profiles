// Restore the stock archive inside a macOS DeepSeek Harness bundle.
// Usage: node revert.mjs "/Applications/DeepSeek Harness.app"
//
// The stock archive was saved by deploy.mjs before the first patch. Restoring
// it also means restoring Info.plist's ElectronAsarIntegrity hash and
// re-signing ad-hoc, otherwise the bundle keeps a stale seal and hash.
import fs from 'node:fs'
import path from 'node:path'
import { readSignatureState, releaseSignatureState, signApp, verifyApp, syncAsarIntegrity } from './macos-sign.mjs'

const target = path.resolve(process.argv[2] ?? '/Applications/DeepSeek Harness.app')
const isBundle = target.endsWith('.app')
const resources = isBundle ? path.join(target, 'Contents', 'Resources') : path.join(target, 'resources')
const asarPath = path.join(resources, 'app.asar')
const stockPath = path.join(resources, 'app.asar.stock')

if (!fs.existsSync(stockPath)) throw new Error(`no stock backup at ${stockPath}; nothing to restore`)
const signature = isBundle && process.platform === 'darwin' ? readSignatureState(target) : undefined
const backup = path.join(resources, 'app.asar.patched-backup')
if (fs.existsSync(backup)) fs.rmSync(backup, { force: true })
fs.renameSync(asarPath, backup)
fs.copyFileSync(stockPath, asarPath)
fs.rmSync(path.join(resources, 'dsh-profile-patch.json'), { force: true })

if (isBundle && process.platform === 'darwin') {
  syncAsarIntegrity(target)
  const signed = signApp(target, signature ?? { entitlements: undefined, runtime: false })
  releaseSignatureState(signature)
  if (signed) verifyApp(target)
}
console.log(`restored the stock archive; the patched one is kept at ${backup}`)
