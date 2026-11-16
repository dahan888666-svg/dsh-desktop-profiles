	const createRuntimeFor = (profileName) => {
		const runtimePaths = resolveDesktopPaths(dshHome, profileName);
		const runtime = {
			name: profileName,
			paths: runtimePaths,
			manager: new DesktopProjectManager(runtimePaths, resources),
			host: void 0,
			url: void 0,
			cookie: void 0,
			injections: void 0,
			platformSession: void 0,
			ready: false,
			failure: void 0,
			starting: void 0
		};
		runtime.start = async (prepare) => {
			if (runtime.ready) return runtime;
			if (runtime.starting !== void 0) return runtime.starting;
			runtime.starting = (async () => {
				runtime.failure = void 0;
				await runtime.manager.applyRelease();
				if (prepare !== void 0) await prepare();
				const hostInspectPort = developmentHostInspectPort(development);
				const host = new DesktopHostProcess(resources.node, resources.dsh, runtime.paths.profile, hostInspectPort, {
					...hostEnvironment,
					DSH_HOME: runtime.paths.home,
					DSH_CLIENT_VERSION: desktopClientVersion()
				}, (failure) => {
					runtime.failure = failure;
					runtime.ready = false;
					if (runtime.name === activeProfileName) reportFatal(failure, "host");
					else sendProfilesChanged();
				}, primaryRuntime, resources, (next) => {
					runtime.platformSession = next;
					if (runtime.name === activeProfileName) platformView.setSession(next);
				}, (record) => {
					operationJournal ??= new OperationJournal(join(app.getPath("userData"), "plugin-operations"), {
						segmentBytes: 256 * 1024,
						recordBytes: 4096,
						queuedBytes: 64 * 1024
					});
					operationJournal.enqueue(JSON.stringify(record));
				});
				runtime.host = host;
				const ready = await host.start();
				runtime.url = ready.url;
				runtime.cookie = await authenticateWebHost(ready.url);
				runtime.injections = ready.injections ?? [];
				runtime.failure = void 0;
				runtime.ready = true;
				return runtime;
			})().finally(() => {
				runtime.starting = void 0;
			});
			return runtime.starting;
		};
		runtime.stop = async () => {
			const host = runtime.host;
			runtime.ready = false;
			runtime.url = void 0;
			runtime.cookie = void 0;
			runtime.injections = void 0;
			runtime.failure = void 0;
			if (host !== void 0) await host.stop().catch((error) => {
				console.error(error);
			});
			runtime.host = void 0;
		};
		return runtime;
	};
	const runtimes = new Map();
	const runtimeFor = (profileName) => {
		let runtime = runtimes.get(profileName);
		if (runtime === void 0) {
			runtime = createRuntimeFor(profileName);
			runtimes.set(profileName, runtime);
		}
		return runtime;
	};
	const startAccountWatch = () => {
		if (welcomeBackend === void 0) return;
		const accountBackend = welcomeBackend.account;
		stopAccount = accountBackend.watch((state) => {
			if (quitting) return;
			if (welcomeWindow !== void 0 && !welcomeWindow.isDestroyed()) welcomeWindow.webContents.send(WELCOME_IPC.state, state);
			const attempt = state.attempt;
			if (attempt?.phase === "waiting-browser" && attempt.authorizeUrl !== void 0 && openedAttempt !== attempt.id) {
				openedAttempt = attempt.id;
				shell.openExternal(platformLoginUrl(attempt.authorizeUrl)).catch(() => void 0);
			}
			if ((attempt?.phase === "failed" || attempt?.phase === "expired") && returnedAttempt !== attempt.id) {
				returnedAttempt = attempt.id;
				focusPrimaryWindow();
			}
			if (state.status === "credential-stored" && attempt?.phase === "succeeded" && welcomeWindow !== void 0) enterWorkspace({ activate: false }).catch(() => void 0);
			if (previousAccountStatus === "credential-stored" && state.status === "signed-out") readWelcomeState().then(async (value) => {
				if (needsWelcome(value) && !quitting) {
					enteredWorkspace = false;
					await showWelcome();
					if (welcomeWindow !== void 0 && !welcomeWindow.isDestroyed()) welcomeWindow.webContents.send(WELCOME_IPC.state, state);
				}
			}).catch(() => void 0);
			previousAccountStatus = state.status;
		}, () => {}, () => {
			readWelcomeState().then(async (value) => {
				if (!needsWelcome(value) || quitting) return;
				pendingWelcomeNotice = "session-expired";
				enteredWorkspace = false;
				await showWelcome();
				const state = await accountBackend.state();
				if (welcomeWindow !== void 0 && !welcomeWindow.isDestroyed()) welcomeWindow.webContents.send(WELCOME_IPC.state, state);
			}).catch(() => void 0);
		}, (enabled) => {
			analyticsEnabled = enabled;
		});
	};
	const bindActive = async (runtime) => {
		hostUrl = runtime.url;
		hostCookie = runtime.cookie;
		injections = runtime.injections ?? [];
		removeLegacyHostCookies(session.defaultSession.cookies, runtime.url).catch((error) => {
			console.error("desktop: legacy Host cookie cleanup failed", error);
		});
		welcomeBackend = connectDesktopWelcome(runtime.url, runtime.cookie);
		analyticsEnabled = await welcomeBackend.analyticsEnabled().catch(() => false);
		if (!reportedLaunch) {
			reportedLaunch = true;
			track("desktop_app_launch", {});
		}
		stopAccount?.();
		stopAccount = void 0;
		previousAccountStatus = void 0;
		openedAttempt = void 0;
		returnedAttempt = void 0;
		startAccountWatch();
		platformView.setSession(runtime.platformSession ?? null);
	};
	const backend = {
		get host() {
			const runtime = runtimes.get(activeProfileName);
			return runtime?.ready === true ? runtime.host : void 0;
		},
		get state() {
			const runtime = runtimes.get(activeProfileName);
			if (runtime?.failure !== void 0) return errorState(runtime.failure);
			return { phase: runtime?.ready === true ? "ready" : "starting" };
		},
		get activeName() {
			return activeProfileName;
		},
		async start(prepare) {
			const runtime = runtimeFor(activeProfileName);
			await runtime.start(prepare);
			await bindActive(runtime);
			if (!shuttingDown) backendReady = true;
		},
		async activate(name, prepare) {
			const runtime = runtimeFor(name);
			await runtime.start(prepare);
			activeProfileName = name;
			await bindActive(runtime);
			if (!shuttingDown) backendReady = true;
		},
		async stop() {
			for (const runtime of [...runtimes.values()]) await runtime.stop();
			runtimes.clear();
		},
		async close() {
			await backend.stop();
		},
		async inspect(name) {
			const runtime = runtimes.get(name ?? activeProfileName);
			if (runtime?.ready !== true) return { activeTasks: false, scheduledTasks: false };
			return await runtime.host.inspectQuit();
		},
		async inspectAll() {
			let activeTasks = false;
			let scheduledTasks = false;
			for (const runtime of runtimes.values()) {
				if (runtime.ready !== true) continue;
				try {
					const inspection = await runtime.host.inspectQuit();
					activeTasks = activeTasks || inspection.activeTasks;
					scheduledTasks = scheduledTasks || inspection.scheduledTasks;
				} catch (error) {
					activeTasks = true;
				}
			}
			return {
				activeTasks,
				scheduledTasks
			};
		}
	};
