# DSH Desktop Profiles（DSH bundle 载体）

## 这是什么

给 DeepSeek Harness **桌面端**加上多 Profile：每个 Profile 独立 `DSH_HOME`（会话、账号凭据、插件、设置、附件隔离），侧边栏一行切换器，点「＋」新建并原地切换，切换不会中断其它 Profile 正在运行的任务。

本目录是 **DSH bundle 形式的载体**，可以像普通插件一样被 `dsh plugin add` 或应用内「插件 → 添加插件 → 本地目录」安装。

## 它不负责安装

DSH 的 bundle 运行在 Host / Web Client 里，**改不了 Electron 外壳**（`resources/app.asar` 里的 `lib/main.js`）。真正的安装动作发生在仓库根目录：

| 系统 | 安装入口 |
|---|---|
| Windows | `Install-Windows.cmd` |
| macOS | `install-macos.command` |

安装并重启应用后，`index.js` 会在 Host 日志里报告**补丁版本**与 Profile 数据目录；未安装时只提示 “shell patch not installed”。

## 安装（可选）

在应用内「插件 → 添加插件 → 本地目录」选择本目录即可；也可以：

```
dsh plugin --profile <profile> add <repo>/plugin
```

桌面端 profile 由应用管理，实际安装建议走应用内插件页。

## 支持的版本

补丁绑定 DSH Desktop **0.2.2-rc.3**（校验 `lib/main.js` 的 SHA-256）。其他版本安装器会拒绝，需要用 `macos/tools/build.mjs` 重新构建补丁。

## 数据位置

- 默认 Profile：Windows `%USERPROFILE%\.dsh`；macOS `~/.dsh`（原样，不迁移）
- 命名 Profile：`<DSH_HOME>/desktop-profiles/<name>/home`
- 删除的 Profile：`<DSH_HOME>/desktop-profiles/.trash/`

## 说明

载体本身不修改任何文件，只做状态检测；卸载插件不会移除外壳补丁。外壳补丁请用 `Uninstall-Windows.cmd` / `uninstall-macos.command` 卸载。
