// Restore the stock archive kept by the installer.
// Usage: node revert.mjs <installDir>
import fs from 'node:fs'
import path from 'node:path'

const installDir = path.resolve(process.argv[2] ?? 'D:\\DSH')
const resources = path.join(installDir, 'resources')
const asarPath = path.join(resources, 'app.asar')
const stockPath = path.join(resources, 'app.asar.stock')

if (!fs.existsSync(stockPath)) throw new Error(`no stock backup at ${stockPath}; nothing to restore`)
const backup = path.join(resources, 'app.asar.patched-backup')
if (fs.existsSync(backup)) fs.rmSync(backup, { force: true })
fs.renameSync(asarPath, backup)
fs.copyFileSync(stockPath, asarPath)
fs.rmSync(path.join(resources, 'dsh-profile-patch.json'), { force: true })
console.log(`restored the stock archive; the patched one is kept at ${backup}`)
