# Changelog

## 0.1.3 — 2026-11-16

### macOS 安装器修复

- 替换 `app.asar` 后同步更新 `Info.plist` 的 `ElectronAsarIntegrity` 哈希（0.1.2 会留下旧值）。
- 重新签名时保留 bundle 原有的 hardened runtime 与 entitlements（JIT、unsigned executable memory、library validation、音频输入）；0.1.2 的 `codesign --deep` 会丢掉这些权限。
- 改为只签主 bundle，不再 `--deep`，避免破坏 `Contents/Frameworks` 与 Helper 的原有签名。
- 签名后执行 `codesign --verify` 校验；失败时给出可操作的提示。
- `revert.mjs` 卸载时同样恢复 `ElectronAsarIntegrity` 并按相同规则重签。
- 已打补丁但缺少 `app.asar.stock` 时明确拒绝安装，避免把补丁版 asar 误当作官方备份。

### 打包

- 修复 `plugin/package.json` 的 UTF-8 BOM（应用内「添加插件」会误报“该路径不存在或不是有效的插件包”）。
- `plugin/index.js` 状态检测同时识别 macOS 与 Windows 的补丁标记路径，并在日志中显示 `patchVersion`；载体不再内嵌安装器副本，安装入口统一在仓库根目录。
- 版本更新到 0.1.3；运行时补丁与 0.1.2 完全一致，仅安装器与元数据变化。

## 0.1.2 — 2026-11-16

### macOS（实验性）

- 新增 macOS 安装包（`dsh-desktop-profiles-0.1.2-macos.zip`）：
  - `install.command`：退出应用、备份 `Contents/Resources/app.asar`、**用该 Mac 上的官方 app.asar 现场构建补丁**、替换并 `codesign --force --sign - --deep` 重新签名；
  - `launch.command`：自愈启动器（DSH 更新后自动重建补丁）；
  - `uninstall.command`：恢复官方 `app.asar` 并重新签名；
  - 说明与已知问题见 `mac/README-macos.md`。
- 未在 Mac 真机验证；安装器会在版本/锚点不匹配时拒绝并给出提示。

## 0.1.1 — 2026-11-16

侧边栏样式改版（方案 A：无边框身份行）。

- Profile 行改为与侧边栏其他行同构的无边框行：头像 + 名称 + 状态点 + SVG 箭头；
- `＋` 降为幽灵按钮，悬停/键盘聚焦时出现；
- 行下增加细分隔线，区分“身份”与主操作“新会话”；
- 头像按 Profile 名派生 6 色柔和色板，便于区分；
- 切换弹窗重做：标题“切换 Profile + 独立会话与登录”、40px 行高、`当前/运行中/失败` 徽标、悬停删除、底部快捷键提示、↑↓/Enter/Esc 键盘操作；
- 折叠态（56px rail）只保留头像按钮，点击开弹窗；
- 无功能行为变化，仅样式与可访问性。

## 0.1.0 — 2026-11-16

首个可分发版本。

### 功能

- 侧边栏 Profile 行（“新会话”上方），点 `＋` 新建并原地切换。
- 每个 Profile 独立 `DSH_HOME`：会话、账号凭据、插件、配置、附件隔离。
- 同窗口切换，多 Host 并发常驻，**切换不中断其它 Profile 的任务**。
- 新建时可复制当前登录凭据、沿用当前模型设置（可关闭）。
- 删除 Profile 移入 `.trash`，可手工恢复。
- `--profile <name>` / `DSH_DESKTOP_PROFILE` 直启；应用运行时再次执行会切换现有窗口。

### 分发

- 一键安装器 `Install.cmd`（自动定位安装目录、按安装目录关闭进程、备份 `app.asar`、失败自动回退）。
- 卸载/回滚 `Uninstall.cmd`（数据保留）。
- 自愈启动器 `Launch.cmd`：DSH 更新覆盖补丁后，下次通过它启动会自动重打补丁。
- `Repair.cmd`：手动检查/修复。
- `plugin/`：可发布为 DSH bundle 的载体，随包携带安装器并做状态检测。

### 兼容性

- 目标 DSH Desktop `0.2.2-rc.3`（校验 `lib/main.js` SHA-256）。
- 其他版本：安装器拒绝打补丁，启动器保持官方界面并记录日志（应用不受影响）。
- 支持 `payload-versions/<version>/` 多版本补丁包。

### 已知限制

- 同一时刻只显示一个窗口，Profile 通过切换访问。
- 插件不跨 Profile 共享。
- 平台网站 cookie 与 Web 前端 localStorage 仍共享。
- 空闲 Profile 的 Host 暂不自动回收（重启释放）。
