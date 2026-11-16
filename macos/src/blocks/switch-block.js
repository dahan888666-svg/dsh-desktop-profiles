	const PROFILES_IPC = {
		list: "dsh-desktop:profiles-list",
		create: "dsh-desktop:profiles-create",
		switch: "dsh-desktop:profiles-switch",
		remove: "dsh-desktop:profiles-remove",
		rename: "dsh-desktop:profiles-rename",
		changed: "dsh-desktop:profiles-changed"
	};
	let switching;
	function sendProfilesChanged() {
		const payload = profilesStatus();
		for (const window of BrowserWindow.getAllWindows()) {
			if (window.isDestroyed()) continue;
			window.webContents.send(PROFILES_IPC.changed, payload);
		}
	}
	const profilesStatus = () => {
		const profiles = profileStore.list().map((profile) => {
			const runtime = runtimes.get(profile.name);
			return {
				name: profile.name,
				label: profile.label,
				builtin: profile.builtin === true,
				running: runtime?.ready === true,
				failed: runtime?.failure !== void 0,
				active: profile.name === activeProfileName
			};
		});
		return {
			active: activeProfileName,
			switching: switching?.name ?? null,
			profiles
		};
	};
	const desktopProfileBundles = () => {
		try {
			const value = JSON.parse(readFileSync(join(app.getAppPath(), "lib", "desktop-profile-template.json"), "utf8"));
			if (Array.isArray(value.bundles) && value.bundles.length > 0 && value.bundles.every((entry) => typeof entry === "string")) return value.bundles;
		} catch (error) {
			console.warn("desktop profiles: bundle template unavailable", error);
		}
		return ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app"];
	};
	const createProfileFromInput = (input) => {
		const name = typeof input?.name === "string" ? input.name.trim().toLowerCase() : "";
		const rawLabel = typeof input?.label === "string" ? input.label.trim() : "";
		const label = (rawLabel === "" ? name : rawLabel).slice(0, 40);
		if (!isValidProfileName(name)) throw new Error("invalid-profile-name");
		if (profileStore.get(name) !== void 0) throw new Error("profile-exists");
		return createProfileFiles({
			store: profileStore,
			dshHome,
			name,
			label,
			bundles: desktopProfileBundles(),
			initProfile,
			copyCredentials: input?.copyCredentials !== false,
			copyModelPatch: input?.copyModelPatch !== false,
			source: {
				home: paths.home,
				profile: paths.profile
			}
		});
	};
	const switchProfile = async (name) => {
		const target = profileStore.get(name);
		if (target === void 0) throw new Error("unknown-profile");
		if (switching !== void 0) return await switching.promise;
		if (name === activeProfileName) return { active: name, unchanged: true };
		const previous = activeProfileName;
		const job = { name };
		job.promise = (async () => {
			sendProfilesChanged();
			navigation = void 0;
			try {
				await navigateMain(`${SCHEME}://shell/switch.html?name=${encodeURIComponent(target.label)}&lang=${locale.id.toLowerCase().startsWith("zh") ? "zh" : "en"}`);
			} catch (error) {
				console.warn("desktop profiles: transition page failed", error);
			}
			try {
				await backend.activate(name, prepareHostEnvironment);
				profileStore.setLast(name);
				enteredWorkspace = false;
				await openInitialWindow();
				return { active: name };
			} catch (error) {
				console.error("desktop profiles: switch failed", error);
				try {
					await backend.activate(previous, prepareHostEnvironment);
				} catch (rollbackError) {
					console.error("desktop profiles: rollback failed", rollbackError);
				}
				enteredWorkspace = false;
				try {
					navigation = void 0;
					await navigateMain(applicationUrl);
				} catch {}
				throw error;
			} finally {
				switching = void 0;
				sendProfilesChanged();
			}
		})();
		switching = job;
		return await job.promise;
	};
	ipcMain.handle(PROFILES_IPC.list, async (event) => {
		assertMainApplication(event);
		const status = profilesStatus();
		await Promise.all(status.profiles.map(async (entry) => {
			const runtime = runtimes.get(entry.name);
			if (runtime?.ready !== true) return;
			try {
				const inspection = await Promise.race([runtime.host.inspectQuit(), new Promise((resolve) => {
					const timer = setTimeout(() => resolve(void 0), 800);
					timer.unref?.();
				})]);
				entry.activeTasks = inspection?.activeTasks === true;
			} catch {
				entry.activeTasks = false;
			}
		}));
		return status;
	});
	ipcMain.handle(PROFILES_IPC.create, async (event, input) => {
		assertMainApplication(event);
		const created = createProfileFromInput(input);
		sendProfilesChanged();
		return { ...created, status: profilesStatus() };
	});
	ipcMain.handle(PROFILES_IPC.switch, async (event, name) => {
		assertMainApplication(event);
		if (typeof name !== "string") throw new Error("invalid-profile-name");
		return await switchProfile(name);
	});
	ipcMain.handle(PROFILES_IPC.remove, async (event, name) => {
		assertMainApplication(event);
		if (typeof name !== "string") throw new Error("invalid-profile-name");
		const target = profileStore.get(name);
		if (target === void 0) throw new Error("unknown-profile");
		if (target.builtin === true) throw new Error("profile-not-removable");
		if (target.name === activeProfileName) throw new Error("profile-active");
		const runtime = runtimes.get(target.name);
		if (runtime !== void 0) {
			await runtime.stop();
			runtimes.delete(target.name);
		}
		const location = trashProfile(dshHome, target.name);
		profileStore.remove(target.name);
		sendProfilesChanged();
		return { removed: target.name, location };
	});
	ipcMain.handle(PROFILES_IPC.rename, async (event, name, label) => {
		assertMainApplication(event);
		if (typeof name !== "string" || typeof label !== "string") throw new Error("invalid-profile-label");
		const target = profileStore.get(name);
		if (target === void 0) throw new Error("unknown-profile");
		if (target.builtin === true) throw new Error("profile-not-renamable");
		const trimmed = label.trim().slice(0, 40);
		if (trimmed === "") throw new Error("invalid-profile-label");
		profileStore.rename(name, trimmed);
		sendProfilesChanged();
		return profilesStatus();
	});
	handleSecondInstance = (argv) => {
		const requested = parseProfileArg(Array.isArray(argv) ? argv : []);
		console.info("desktop profiles: second instance", JSON.stringify({ argv, requested, active: activeProfileName }));
		if (requested !== void 0 && requested !== activeProfileName) {
			switchProfile(requested).catch((error) => {
				console.error("desktop profiles: requested profile switch failed", error);
				focusPrimaryWindow();
			});
			return;
		}
		focusPrimaryWindow();
	};
