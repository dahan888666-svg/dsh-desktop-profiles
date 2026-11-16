// Build the patched desktop tree from the stock app.asar plus src/.
// Usage: node build.mjs [root] [stockAsar]
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createHash } from 'node:crypto'
import { readArchive, readEntry } from './asar.mjs'

const root = path.resolve(process.argv[2] ?? path.join(import.meta.dirname, '..'))
const stock = process.argv[3] ?? (fs.existsSync('D:\\DSH\\resources\\app.asar.stock') ? 'D:\\DSH\\resources\\app.asar.stock' : 'D:\\DSH\\resources\\app.asar')
const src = path.join(root, 'src')
const out = path.join(root, 'build', 'app')
const log = []
const fail = (message) => { throw new Error(message) }

function findEntry(tree, rel) {
  let node = tree
  for (const part of rel.split('/')) {
    node = node?.files?.[part]
    if (node === undefined) return undefined
  }
  return node
}

function readStock(archive, rel) {
  const entry = findEntry(archive.tree, rel)
  if (entry === undefined || entry.files !== undefined) fail(`stock entry missing: ${rel}`)
  return readEntry(archive, entry).toString('utf8')
}

function replaceOnce(text, find, replacement, label) {
  const index = text.indexOf(find)
  if (index === -1) fail(`anchor not found: ${label}`)
  if (text.indexOf(find, index + 1) !== -1) fail(`anchor is not unique: ${label}`)
  return text.slice(0, index) + replacement + text.slice(index + find.length)
}

function spliceBetween(text, start, end, replacement, label) {
  const startIndex = text.indexOf(start)
  if (startIndex === -1) fail(`start marker not found: ${label}`)
  const endIndex = text.indexOf(end, startIndex + start.length)
  if (endIndex === -1) fail(`end marker not found: ${label}`)
  return text.slice(0, startIndex) + replacement + text.slice(endIndex + end.length)
}

const block = (name) => fs.readFileSync(path.join(src, 'blocks', name), 'utf8')

fs.rmSync(out, { recursive: true, force: true })
fs.mkdirSync(out, { recursive: true })

const archive = readArchive(stock)

// ---------- lib/main.js ----------
let main = readStock(archive, 'lib/main.js')
main = `import { ProfileStore, createProfileFiles, cleanRegistryTemps, parseProfileArg, resolveStartupProfile, isValidProfileName, trashProfile, DEFAULT_PROFILE, profilePaths } from "./profiles.js";\n` + main

main = replaceOnce(main,
  'let shuttingDown = false;',
  'let shuttingDown = false;\nlet activeProfileName = "desktop";\nlet handleSecondInstance = () => {};',
  'module profile state')

main = replaceOnce(main,
  `function resolveDesktopPaths(dshHome = resolveDshHome()) {
	return {
		profile: join(dshHome, "profiles", "desktop"),
		lock: join(dshHome, "profiles", "desktop", "lock")
	};
}`,
  `function resolveDesktopPaths(dshHome = resolveDshHome(), profile = DEFAULT_PROFILE) {
	const resolved = profilePaths(resolve(dshHome), profile);
	return {
		name: resolved.name,
		home: resolved.home,
		profile: resolved.profile,
		lock: resolved.lock
	};
}`,
  'resolveDesktopPaths')

main = replaceOnce(main,
  'const backupPath = await new DesktopProjectManager(resolveDesktopPaths(), runtimeResources()).disableAllPlugins();',
  'const backupPath = await new DesktopProjectManager(resolveDesktopPaths(void 0, activeProfileName), runtimeResources()).disableAllPlugins();',
  'recovery profile paths')

main = replaceOnce(main,
  `	const resources = runtimeResources();
	const paths = resolveDesktopPaths();
	const development = !app.isPackaged;
	const primaryRuntime = development ? developmentPrimaryRuntime() : join(process.resourcesPath, "runtime", "primary-runtime");
	const activeProject = paths.profile;
	const manager = new DesktopProjectManager(paths, resources);`,
  `	const resources = runtimeResources();
	const development = !app.isPackaged;
	const primaryRuntime = development ? developmentPrimaryRuntime() : join(process.resourcesPath, "runtime", "primary-runtime");
	const dshHome = resolveDshHome();
	const profileStore = new ProfileStore(dshHome);
	profileStore.ensure();
	cleanRegistryTemps(dshHome);
	activeProfileName = resolveStartupProfile(profileStore, process.argv, process.env);
	profileStore.setLast(activeProfileName);
	let paths = resolveDesktopPaths(dshHome, activeProfileName);
	let activeProject = paths.profile;
	let manager = new DesktopProjectManager(paths, resources);`,
  'main profile setup')

main = spliceBetween(main,
  '\tconst backend = new DesktopBackendController((onFailure) => {',
  '\t}, (state) => {\n\t\tif (state.phase === "error") reportFatal(state.failure, "host");\n\t\telse if (!shuttingDown) backendReady = state.phase === "ready";\n\t});',
  block('host-block.js'),
  'backend controller')

main = replaceOnce(main,
  `			await backend.start(async () => {
				await Promise.all([manager.applyRelease(), prepareHostEnvironment()]);
			});`,
  '			await backend.start(prepareHostEnvironment);',
  'reconcile prepare')

main = replaceOnce(main,
  '\t\tinspect: () => backend.host?.inspectQuit(),',
  '\t\tinspect: () => backend.inspectAll(),',
  'quit inspection')

main = replaceOnce(main,
  `if (claimDesktopSingleInstance(app, () => {
	focusPrimaryWindow();
}))`,
  `if (claimDesktopSingleInstance(app, (_event, argv) => {
	handleSecondInstance(argv);
}))`,
  'second instance')

main = replaceOnce(main,
  `		} else await enterWorkspace();
	};
	focusPrimaryWindow = () => {`,
  `		} else await enterWorkspace();
	};
${block('switch-block.js')}
	focusPrimaryWindow = () => {`,
  'profile switch block')

const mainPath = path.join(out, 'lib', 'main.js')
fs.mkdirSync(path.dirname(mainPath), { recursive: true })
fs.writeFileSync(mainPath, main)
log.push(`lib/main.js ${Buffer.byteLength(main)} bytes`)

// ---------- lib/preload-app.cjs ----------
let preload = readStock(archive, 'lib/preload-app.cjs')
preload = replaceOnce(preload,
  '//#region lib/types/platform-ipc.js',
  `const PROFILES_IPC = {
	list: "dsh-desktop:profiles-list",
	create: "dsh-desktop:profiles-create",
	switch: "dsh-desktop:profiles-switch",
	remove: "dsh-desktop:profiles-remove",
	rename: "dsh-desktop:profiles-rename",
	changed: "dsh-desktop:profiles-changed"
};
//#region lib/types/platform-ipc.js`,
  'preload profile channels')

preload = replaceOnce(preload,
  '\t\tdeviceInfo: () => electron.ipcRenderer.invoke(DESKTOP_IPC.deviceInfo),',
  `\t\tprofiles: {
			list: () => electron.ipcRenderer.invoke(PROFILES_IPC.list),
			create: (input) => electron.ipcRenderer.invoke(PROFILES_IPC.create, input),
			switch: (name) => electron.ipcRenderer.invoke(PROFILES_IPC.switch, name),
			remove: (name) => electron.ipcRenderer.invoke(PROFILES_IPC.remove, name),
			rename: (name, label) => electron.ipcRenderer.invoke(PROFILES_IPC.rename, name, label),
			subscribe(listener) {
				const handle = (_event, snapshot) => {
					listener(snapshot);
				};
				electron.ipcRenderer.on(PROFILES_IPC.changed, handle);
				return () => {
					electron.ipcRenderer.off(PROFILES_IPC.changed, handle);
				};
			}
		},
		deviceInfo: () => electron.ipcRenderer.invoke(DESKTOP_IPC.deviceInfo),`,
  'preload profile api')

const preloadPath = path.join(out, 'lib', 'preload-app.cjs')
fs.writeFileSync(preloadPath, preload)
log.push(`lib/preload-app.cjs ${Buffer.byteLength(preload)} bytes`)

// ---------- sidebar client ----------
const sidebarRel = 'dsh/node_modules/@deepseek-ai/dsh-client-ui-sidebar/lib/client.js'
let sidebar = readStock(archive, sidebarRel)
sidebar = replaceOnce(sidebar,
  'function apply(ctx){const workspaceNavigation=ctx.get(`uiWorkspace`);',
  `${block('sidebar-profile-bar.js')}\nfunction apply(ctx){const workspaceNavigation=ctx.get(\`uiWorkspace\`);`,
  'sidebar component')

sidebar = replaceOnce(sidebar,
  ',canStartSession&&(0,react_jsx_runtime.jsx)(`div`,{className:SidebarRoot_module_css_default.newSessionRow',
  ',(0,react_jsx_runtime.jsx)(__DshProfileBar,{wide}),canStartSession&&(0,react_jsx_runtime.jsx)(`div`,{className:SidebarRoot_module_css_default.newSessionRow',
  'sidebar row mount')

const sidebarPath = path.join(out, ...sidebarRel.split('/'))
fs.mkdirSync(path.dirname(sidebarPath), { recursive: true })
fs.writeFileSync(sidebarPath, sidebar)
log.push(`${sidebarRel} ${Buffer.byteLength(sidebar)} bytes`)

// ---------- new files ----------
fs.copyFileSync(path.join(src, 'profiles.js'), path.join(out, 'lib', 'profiles.js'))
fs.mkdirSync(path.join(out, 'renderer'), { recursive: true })
fs.copyFileSync(path.join(src, 'switch.html'), path.join(out, 'renderer', 'switch.html'))

const templateBundles = (() => {
  const candidates = [
    path.join(os.homedir(), '.dsh', 'profiles', 'desktop', 'package.json'),
    path.join(root, 'test', 'home-ref', 'profiles', 'desktop', 'package.json')
  ]
  for (const candidate of candidates) {
    try {
      const value = JSON.parse(fs.readFileSync(candidate, 'utf8'))
      const bundles = value?.dsh?.profile?.bundles
      if (Array.isArray(bundles) && bundles.length > 0) return bundles
    } catch {}
  }
  return [
    '@deepseek-ai/dsh-base',
    '@deepseek-ai/dsh-web-app',
    '@deepseek-ai/dsh-experimental-auto-review',
    '@deepseek-ai/dsh-experimental-voice-input-bundle'
  ]
})()
fs.writeFileSync(path.join(out, 'lib', 'desktop-profile-template.json'), `${JSON.stringify({ schemaVersion: 1, bundles: templateBundles }, null, 2)}\n`)
log.push(`template bundles: ${templateBundles.join(', ')}`)

// ---------- manifest of patched files ----------
const stockMain = readStock(archive, 'lib/main.js')
const stockManifest = JSON.parse(readStock(archive, 'package.json'))
const manifest = {
  schemaVersion: 1,
  patchVersion: fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim(),
  desktopVersion: stockManifest.version,
  builtAt: new Date().toISOString(),
  stockMainSha256: createHash('sha256').update(stockMain).digest('hex'),
  files: [
    'lib/main.js',
    'lib/preload-app.cjs',
    sidebarRel,
    'lib/profiles.js',
    'renderer/switch.html',
    'lib/desktop-profile-template.json'
  ]
}
fs.writeFileSync(path.join(out, 'dsh-profile-patch.json'), `${JSON.stringify(manifest, null, 2)}\n`)

console.log(log.join('\n'))
console.log(`\nbuilt into ${out}`)
