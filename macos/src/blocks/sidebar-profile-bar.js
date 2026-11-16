	const __DSHPB_CSS = `
.dshpb-root{margin:2px var(--dsh-sidebar-inline-padding,12px) 0}
.dshpb-row{display:flex;align-items:center;gap:6px;height:30px;padding:0 6px 0 4px;border-radius:8px}
.dshpb-row:hover{background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb,CanvasText 6%,transparent))}
.dshpb-main{flex:1;min-width:0;display:flex;align-items:center;gap:8px;height:30px;padding:0;border:0;border-radius:8px;background:transparent;color:inherit;font:inherit;cursor:pointer;text-align:left}
.dshpb-main:focus-visible{outline:2px solid var(--dsw-focus-ring-color,#4f8cff);outline-offset:1px}
.dshpb-avatar{width:20px;height:20px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex:none;background:color-mix(in srgb,CanvasText 10%,transparent);color:inherit}
.dshpb-t0{background:color-mix(in srgb,#4f8cff 18%,transparent);color:#3b6fd4}
.dshpb-t1{background:color-mix(in srgb,#f0a35e 22%,transparent);color:#b9722a}
.dshpb-t2{background:color-mix(in srgb,#63b58c 22%,transparent);color:#2f7d59}
.dshpb-t3{background:color-mix(in srgb,#9678dc 22%,transparent);color:#6b52b8}
.dshpb-t4{background:color-mix(in srgb,#dc78a0 22%,transparent);color:#a84f74}
.dshpb-t5{background:color-mix(in srgb,#8892a0 18%,transparent);color:#5b6472}
.dshpb-name{flex:1;min-width:0;font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:inherit}
.dshpb-dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-business-primary,#4f8cff);flex:none}
.dshpb-dot-fail{background:#e5484d}
.dshpb-chev{display:inline-flex;flex:none;color:var(--dsw-alias-label-secondary,#6b7280)}
.dshpb-plus{width:24px;height:24px;flex:none;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary,#6b7280);cursor:pointer;opacity:0}
.dshpb-row:hover .dshpb-plus,.dshpb-plus:focus-visible{opacity:1}
.dshpb-plus:hover{background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb,CanvasText 9%,transparent));color:inherit}
.dshpb-plus:focus-visible{outline:2px solid var(--dsw-focus-ring-color,#4f8cff);outline-offset:1px}
.dshpb-divider{height:1px;margin:2px 0 8px;background:color-mix(in srgb,CanvasText 8%,transparent)}
.dshpb-rail{display:flex;justify-content:center;margin:2px 0 6px}
.dshpb-railbtn{width:32px;height:32px;display:grid;place-items:center;border:0;border-radius:8px;background:transparent;color:inherit;cursor:pointer}
.dshpb-railbtn:hover{background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb,CanvasText 7%,transparent))}
.dshpb-railbtn:focus-visible{outline:2px solid var(--dsw-focus-ring-color,#4f8cff);outline-offset:1px}
.dshpb-backdrop{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:flex-start;justify-content:center;padding-top:12vh;background:rgba(15,23,42,.28);-webkit-app-region:no-drag}
.dshpb-panel{width:360px;max-width:calc(100vw - 48px);max-height:72vh;overflow:auto;padding:14px;border-radius:12px;background:Canvas;color:CanvasText;border:1px solid color-mix(in srgb,CanvasText 14%,transparent);box-shadow:0 18px 48px rgba(0,0,0,.28);font-size:13px}
.dshpb-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:8px}
.dshpb-title{font-size:14px;font-weight:600}
.dshpb-sub{font-size:12px;font-weight:400;color:color-mix(in srgb,CanvasText 55%,transparent);margin-left:8px}
.dshpb-close{width:24px;height:24px;display:grid;place-items:center;border:0;border-radius:6px;background:transparent;color:color-mix(in srgb,CanvasText 55%,transparent);cursor:pointer;flex:none}
.dshpb-close:hover{background:color-mix(in srgb,CanvasText 8%,transparent);color:inherit}
.dshpb-list{display:flex;flex-direction:column;gap:2px}
.dshpb-item{height:40px;display:flex;align-items:center;gap:10px;padding:0 8px;border:0;border-radius:8px;background:transparent;color:inherit;font:inherit;cursor:pointer;text-align:left;width:100%}
.dshpb-item:hover{background:color-mix(in srgb,CanvasText 6%,transparent)}
.dshpb-item-current{background:color-mix(in srgb,CanvasText 9%,transparent)}
.dshpb-item .dshpb-avatar{width:24px;height:24px;border-radius:7px;font-size:12px}
.dshpb-item-label{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dshpb-tag{font-size:11px;line-height:1;padding:3px 6px;border-radius:999px;background:color-mix(in srgb,CanvasText 8%,transparent);color:color-mix(in srgb,CanvasText 58%,transparent);white-space:nowrap;flex:none}
.dshpb-tag-run{background:color-mix(in srgb,#4f8cff 16%,transparent);color:#3b6fd4}
.dshpb-tag-fail{background:color-mix(in srgb,#e5484d 15%,transparent);color:#d13438}
.dshpb-rm{width:22px;height:22px;flex:none;display:none;place-items:center;border:0;border-radius:6px;background:transparent;color:color-mix(in srgb,CanvasText 55%,transparent);cursor:pointer}
.dshpb-item:hover .dshpb-rm{display:grid}
.dshpb-rm:hover{background:color-mix(in srgb,CanvasText 10%,transparent);color:inherit}
.dshpb-sep{height:1px;margin:8px 4px;background:color-mix(in srgb,CanvasText 9%,transparent)}
.dshpb-new{width:100%;height:38px;display:flex;align-items:center;gap:10px;padding:0 8px;border:0;border-radius:8px;background:transparent;color:inherit;font:inherit;cursor:pointer;text-align:left}
.dshpb-new:hover{background:color-mix(in srgb,CanvasText 6%,transparent)}
.dshpb-newbox{width:24px;height:24px;flex:none;display:grid;place-items:center;border:1px dashed color-mix(in srgb,CanvasText 22%,transparent);border-radius:7px;color:color-mix(in srgb,CanvasText 55%,transparent)}
.dshpb-form{display:flex;flex-direction:column;gap:8px;padding:2px 2px 0}
.dshpb-field label{display:block;font-size:12px;color:color-mix(in srgb,CanvasText 55%,transparent);margin-bottom:4px}
.dshpb-input{width:100%;height:32px;padding:0 8px;border-radius:8px;border:1px solid color-mix(in srgb,CanvasText 16%,transparent);background:Canvas;color:CanvasText;font:inherit;outline:none}
.dshpb-input:focus{border-color:#4f8cff;box-shadow:0 0 0 3px color-mix(in srgb,#4f8cff 18%,transparent)}
.dshpb-error{color:#e5484d;font-size:11px;margin-top:4px}
.dshpb-checks{display:flex;flex-direction:column;gap:6px;font-size:12px}
.dshpb-checks label{display:flex;align-items:center;gap:6px;cursor:pointer}
.dshpb-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:4px}
.dshpb-btn{height:30px;padding:0 12px;border-radius:8px;border:1px solid color-mix(in srgb,CanvasText 16%,transparent);background:Canvas;color:inherit;font:inherit;cursor:pointer}
.dshpb-btn:hover{background:color-mix(in srgb,CanvasText 6%,transparent)}
.dshpb-btn-primary{background:CanvasText;color:Canvas;border-color:transparent}
.dshpb-btn-primary:disabled{opacity:.5;cursor:default}
.dshpb-foot{display:flex;align-items:center;gap:6px;margin-top:8px;font-size:11px;color:color-mix(in srgb,CanvasText 45%,transparent)}
.dshpb-kbd{font:11px/1.4 ui-monospace,Consolas,monospace;padding:1px 5px;border:1px solid color-mix(in srgb,CanvasText 18%,transparent);border-radius:5px;color:color-mix(in srgb,CanvasText 55%,transparent)}
`;
	function __dshpbText() {
		const raw = typeof navigator === "undefined" ? "en" : navigator.language || "en";
		if (raw.toLowerCase().startsWith("zh")) return {
			title: "切换 Profile",
			subtitle: "独立会话与登录",
			current: "当前",
			running: "运行中",
			failed: "失败",
			newProfile: "新建 Profile",
			name: "名称（小写字母、数字、短横线）",
			namePlaceholder: "work",
			label: "显示名",
			labelPlaceholder: "工作",
			copyCredentials: "复制当前登录凭据",
			copyModelPatch: "沿用当前模型设置",
			create: "创建并切换",
			cancel: "取消",
			remove: "删除",
			removeConfirm: "删除 Profile「{name}」？数据会移到 .trash，可手工恢复。",
			invalidName: "名称只能用小写字母、数字和短横线",
			exists: "该名称已存在",
			hintSelect: "选择",
			hintSwitch: "切换",
			hintClose: "关闭"
		};
		return {
			title: "Profiles",
			subtitle: "separate sessions and sign-in",
			current: "Current",
			running: "Running",
			failed: "Failed",
			newProfile: "New profile",
			name: "Name (lowercase letters, digits, dashes)",
			namePlaceholder: "work",
			label: "Display name",
			labelPlaceholder: "Work",
			copyCredentials: "Copy current sign-in credentials",
			copyModelPatch: "Reuse current model settings",
			create: "Create and switch",
			cancel: "Cancel",
			remove: "Remove",
			removeConfirm: `Remove profile "{name}"? Its data moves to .trash and can be restored manually.`,
			invalidName: "Use lowercase letters, digits and dashes only",
			exists: "That name already exists",
			hintSelect: "select",
			hintSwitch: "switch",
			hintClose: "close"
		};
	}
	function __dshpbInjectStyle() {
		if (typeof document === "undefined") return;
		if (document.querySelector("style[data-dsh-profile-bar]") !== null) return;
		const style = document.createElement("style");
		style.dataset.dshProfileBar = "1";
		style.textContent = __DSHPB_CSS;
		document.head.append(style);
	}
	function __dshpbTint(name) {
		let hash = 0;
		for (let index = 0; index < name.length; index += 1) hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
		return `dshpb-t${hash % 6}`;
	}
	function __dshpbChevron() {
		return react.createElement("span", { className: "dshpb-chev", "aria-hidden": "true" }, react.createElement("svg", {
			width: 13,
			height: 13,
			viewBox: "0 0 16 16",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: 1.6,
			strokeLinecap: "round"
		}, react.createElement("path", { d: "M4 6.5 8 10.5 12 6.5" })));
	}
	function __dshpbPlus(size) {
		return react.createElement("svg", {
			width: size,
			height: size,
			viewBox: "0 0 16 16",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: 1.7,
			strokeLinecap: "round"
		}, react.createElement("path", { d: "M8 3v10M3 8h10" }));
	}
	function __DshProfileBar({ wide }) {
		const api = typeof window === "undefined" ? void 0 : window.dshDesktop?.profiles;
		const [open, setOpen] = react.useState(false);
		const [creating, setCreating] = react.useState(false);
		const [status, setStatus] = react.useState(null);
		const [busy, setBusy] = react.useState("");
		const [error, setError] = react.useState("");
		const [draft, setDraft] = react.useState({ name: "", label: "", copyCredentials: true, copyModelPatch: true });
		const panelRef = react.useRef(null);
		react.useEffect(() => {
			__dshpbInjectStyle();
		}, []);
		react.useEffect(() => {
			if (api === void 0) return;
			let alive = true;
			const load = () => {
				api.list().then((value) => {
					if (alive) setStatus(value);
				}).catch(() => {});
			};
			load();
			const off = api.subscribe((value) => {
				if (alive) setStatus(value);
			});
			return () => {
				alive = false;
				if (typeof off === "function") off();
			};
		}, [api]);
		react.useEffect(() => {
			if (!open) return;
			const onKeyDown = (event) => {
				if (event.key === "Escape") {
					event.stopPropagation();
					close();
					return;
				}
				if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
				const panel = panelRef.current;
				if (panel === null) return;
				const rows = [...panel.querySelectorAll("[data-nav]")];
				if (rows.length === 0) return;
				event.preventDefault();
				const currentIndex = rows.indexOf(document.activeElement);
				const nextIndex = event.key === "ArrowDown"
					? (currentIndex + 1 + rows.length) % rows.length
					: (currentIndex - 1 + rows.length) % rows.length;
				rows[nextIndex].focus();
			};
			document.addEventListener("keydown", onKeyDown, true);
			return () => document.removeEventListener("keydown", onKeyDown, true);
		}, [open]);
		if (api === void 0) return null;
		const text = __dshpbText();
		const profiles = status?.profiles ?? [];
		const active = profiles.find((entry) => entry.active === true) ?? null;
		const label = active?.label ?? "desktop";
		const avatarOf = (profile, large) => react.createElement("span", {
			className: `dshpb-avatar ${__dshpbTint(profile.name)}`,
			style: large ? { width: 24, height: 24, borderRadius: 7, fontSize: 12 } : void 0,
			"aria-hidden": "true"
		}, profile.label.slice(0, 1).toUpperCase());
		const run = async (key, action) => {
			setBusy(key);
			setError("");
			try {
				await action();
			} catch (failure) {
				setError(String(failure?.message ?? failure));
			} finally {
				setBusy("");
			}
		};
		const close = () => {
			setOpen(false);
			setCreating(false);
			setError("");
			setDraft({ name: "", label: "", copyCredentials: true, copyModelPatch: true });
		};
		const submit = () => {
			const name = draft.name.trim().toLowerCase();
			if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name)) {
				setError(text.invalidName);
				return;
			}
			if (profiles.some((entry) => entry.name === name)) {
				setError(text.exists);
				return;
			}
			void run("create", async () => {
				await api.create({
					name,
					label: draft.label.trim() === "" ? name : draft.label.trim(),
					copyCredentials: draft.copyCredentials,
					copyModelPatch: draft.copyModelPatch
				});
				close();
				await api.switch(name);
			});
		};
		const rows = profiles.map((entry, index) => {
			const parts = [avatarOf(entry, true), react.createElement("span", { key: "label", className: "dshpb-item-label" }, entry.label)];
			if (entry.active) parts.push(react.createElement("span", { key: "current", className: "dshpb-tag" }, text.current));
			if (entry.activeTasks === true) parts.push(react.createElement("span", { key: "run", className: "dshpb-tag dshpb-tag-run" }, text.running));
			if (entry.failed === true) parts.push(react.createElement("span", { key: "fail", className: "dshpb-tag dshpb-tag-fail" }, text.failed));
			if (!entry.builtin && !entry.active) parts.push(react.createElement("span", {
				key: "rm",
				className: "dshpb-rm",
				role: "button",
				tabIndex: -1,
				title: text.remove,
				onClick: (event) => {
					event.stopPropagation();
					if (!window.confirm(text.removeConfirm.replace("{name}", entry.label))) return;
					void run(`remove:${entry.name}`, async () => {
						await api.remove(entry.name);
					});
				}
			}, "✕"));
			return react.createElement("button", {
				key: entry.name,
				type: "button",
				"data-nav": "1",
				className: `dshpb-item${entry.active ? " dshpb-item-current" : ""}`,
				onClick: () => {
					if (entry.active) { close(); return; }
					void run(`switch:${entry.name}`, async () => {
						await api.switch(entry.name);
					});
				}
			}, parts);
		});
		const form = creating ? react.createElement("div", { className: "dshpb-form" }, [
			react.createElement("div", { key: "name", className: "dshpb-field" }, [
				react.createElement("label", { key: "l" }, text.name),
				react.createElement("input", {
					key: "i",
					className: "dshpb-input",
					value: draft.name,
					autoFocus: true,
					placeholder: text.namePlaceholder,
					onChange: (event) => setDraft({ ...draft, name: event.target.value }),
					onKeyDown: (event) => { if (event.key === "Enter") submit(); }
				})
			]),
			react.createElement("div", { key: "label", className: "dshpb-field" }, [
				react.createElement("label", { key: "l" }, text.label),
				react.createElement("input", {
					key: "i",
					className: "dshpb-input",
					value: draft.label,
					placeholder: text.labelPlaceholder,
					onChange: (event) => setDraft({ ...draft, label: event.target.value }),
					onKeyDown: (event) => { if (event.key === "Enter") submit(); }
				})
			]),
			react.createElement("div", { key: "checks", className: "dshpb-checks" }, [
				react.createElement("label", { key: "c1" }, [
					react.createElement("input", {
						key: "i",
						type: "checkbox",
						checked: draft.copyCredentials,
						onChange: (event) => setDraft({ ...draft, copyCredentials: event.target.checked })
					}),
					text.copyCredentials
				]),
				react.createElement("label", { key: "c2" }, [
					react.createElement("input", {
						key: "i",
						type: "checkbox",
						checked: draft.copyModelPatch,
						onChange: (event) => setDraft({ ...draft, copyModelPatch: event.target.checked })
					}),
					text.copyModelPatch
				])
			]),
			react.createElement("div", { key: "actions", className: "dshpb-actions" }, [
				react.createElement("button", {
					key: "cancel",
					type: "button",
					className: "dshpb-btn",
					onClick: () => { setCreating(false); setError(""); }
				}, text.cancel),
				react.createElement("button", {
					key: "create",
					type: "button",
					className: "dshpb-btn dshpb-btn-primary",
					disabled: busy === "create",
					onClick: submit
				}, text.create)
			])
		]) : react.createElement("button", {
			key: "new",
			type: "button",
			"data-nav": "1",
			className: "dshpb-new",
			onClick: () => { setCreating(true); setError(""); }
		}, [react.createElement("span", { key: "plus", className: "dshpb-newbox" }, __dshpbPlus(13)), react.createElement("span", { key: "label" }, text.newProfile)]);
		const panel = open ? react.createElement("div", {
			className: "dshpb-backdrop",
			onMouseDown: (event) => { if (event.target === event.currentTarget) close(); }
		}, react.createElement("div", { className: "dshpb-panel", ref: panelRef, role: "dialog", "aria-label": text.title }, [
			react.createElement("div", { key: "head", className: "dshpb-head" }, [
				react.createElement("div", { key: "t" }, [
					react.createElement("span", { key: "title", className: "dshpb-title" }, text.title),
					react.createElement("span", { key: "sub", className: "dshpb-sub" }, text.subtitle)
				]),
				react.createElement("button", { key: "x", type: "button", className: "dshpb-close", onClick: close, "aria-label": text.hintClose }, "✕")
			]),
			react.createElement("div", { key: "list", className: "dshpb-list" }, rows),
			react.createElement("div", { key: "sep", className: "dshpb-sep" }),
			form,
			error === "" ? null : react.createElement("div", { key: "error", className: "dshpb-error" }, error),
			react.createElement("div", { key: "foot", className: "dshpb-foot" }, [
				react.createElement("span", { key: "k1", className: "dshpb-kbd" }, "↑"),
				react.createElement("span", { key: "k2", className: "dshpb-kbd" }, "↓"),
				react.createElement("span", { key: "s1" }, text.hintSelect),
				react.createElement("span", { key: "k3", className: "dshpb-kbd" }, "Enter"),
				react.createElement("span", { key: "s2" }, text.hintSwitch),
				react.createElement("span", { key: "k4", className: "dshpb-kbd" }, "Esc"),
				react.createElement("span", { key: "s3" }, text.hintClose)
			])
		])) : null;
		if (!wide) return react.createElement("div", { className: "dshpb-rail" }, [
			react.createElement("button", {
				key: "rail",
				type: "button",
				className: "dshpb-railbtn",
				title: label,
				"aria-label": `${text.title}: ${label}`,
				onClick: () => setOpen(true)
			}, avatarOf(active ?? { name: "desktop", label }, false)),
			panel
		]);
		return react.createElement("div", { className: "dshpb-root" }, [
			react.createElement("div", { key: "row", className: "dshpb-row" }, [
				react.createElement("button", {
					key: "main",
					type: "button",
					className: "dshpb-main",
					title: text.title,
					onClick: () => setOpen(true)
				}, [
					avatarOf(active ?? { name: "desktop", label }, false),
					react.createElement("span", { key: "name", className: "dshpb-name" }, label),
					active?.activeTasks === true ? react.createElement("span", { key: "dot", className: "dshpb-dot", title: text.running }) : null,
					active?.failed === true ? react.createElement("span", { key: "fail", className: "dshpb-dot dshpb-dot-fail", title: text.failed }) : null,
					__dshpbChevron()
				]),
				react.createElement("button", {
					key: "plus",
					type: "button",
					className: "dshpb-plus",
					title: text.newProfile,
					"aria-label": text.newProfile,
					onClick: () => { setCreating(true); setError(""); setOpen(true); }
				}, __dshpbPlus(14))
			]),
			react.createElement("div", { key: "divider", className: "dshpb-divider" }),
			panel
		]);
	}
