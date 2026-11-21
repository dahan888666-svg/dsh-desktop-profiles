# DSH Desktop Profiles 安装说明书

> 版本：0.1.4 ｜ 适用于 DeepSeek Harness 桌面端 **0.2.2-rc.5**（rc.3 亦可）
> 给 DSH 桌面端增加“多 Profile”：每个 Profile 独立会话、账号凭据、插件与设置；侧边栏一键新建/切换；切换不打断其它 Profile 正在运行的任务。

---

## 0. 先选你的系统

| 你的系统 | 用哪个文件 | 说明 |
|---|---|---|
| **Windows** | `Install-Windows.cmd` | 双击即可，会提示关闭应用一次 |
| **macOS** | `install-macos.command` | 打开终端执行，或右键 → 打开 |

> 一个压缩包里同时包含两套安装器：`windows/` 与 `macos/`。**只需要运行对应系统的那一个。**
> 两个系统都**不会**迁移或改动你现有的 `~/.dsh` 数据。

---

## 1. 安装前检查

- DeepSeek Harness 桌面端已安装并能正常启动；
- 版本为 **0.2.2-rc.3**（安装器会校验；版本不符会拒绝，不会写坏应用）；
- 关闭正在生成中的任务（安装会重启应用一次，进行中的任务会中断，历史不丢）；
- 安装目录可写：
  - Windows 普通安装位置（如 `D:\DSH`）通常可写；`Program Files` 下需要管理员权限；
  - macOS 建议放在 `/Applications`（必要时 `sudo`）或 `~/Applications`。

---

## 2. Windows 安装

1. 解压整个包（不要只把 `.cmd` 拖出来单独运行）。
2. 双击 **`Install-Windows.cmd`**。
3. 脚本会自动定位安装目录；也可指定：

```bat
Install-Windows.cmd "D:\DSH"
```

4. 出现“DeepSeek Harness 正在运行，是否关闭并继续”时输入 `Y`。
5. 等待出现“Installed / 安装完成”，应用会自动重启。
6. 重启后，侧边栏“新会话”上方出现 **Profile 行**（头像 + 名称 + 箭头 + 悬停出现的 `＋`）。

安装器实际做了这些事：

- 只关闭**该安装目录**的进程（不会影响另一份 DSH）；
- 备份官方 `resources\app.asar` → `app.asar.stock`；
- **用当前安装目录里的 `app.asar` 现场构建补丁**并替换（不再依赖预构建 payload，新 DSH 小版本可直接适配）；
- 把工具链复制到 `%LOCALAPPDATA%\dsh-desktop-profiles\toolchain`，并在启动文件夹安装后台自动修复 watcher（60 秒检查一次）；
- 把桌面/开始菜单里指向该程序的快捷方式改为指向 `Launch.cmd`（启动前自愈）；
- 重启应用。

> 如果提示 access denied：右键 `Install-Windows.cmd` → 以管理员身份运行。

---

## 3. macOS 安装

1. 解压后打开“终端”，进入解压目录：

```bash
cd ~/Downloads/dsh-desktop-profiles-0.1.4-all
chmod +x *.command macos/*.command
```

2. 执行安装（默认 `/Applications/DeepSeek Harness.app`）：

```bash
./install-macos.command
# 或指定位置：
./install-macos.command "$HOME/Applications/DeepSeek Harness.app"
```

3. 安装器会：退出应用 → 备份 `Contents/Resources/app.asar` → **用这台 Mac 上的官方 `app.asar` 现场构建补丁**（避免跨平台差异）→ 替换 → 同步 `Info.plist` 的 `ElectronAsarIntegrity` 哈希 → 用原有 hardened runtime / entitlements 做 ad-hoc 重签名（只签主 bundle，不动 Frameworks）→ `codesign --verify` 校验 → 重新打开。

4. 首次打开若被系统拦截：右键应用 → 打开；或在“系统设置 → 隐私与安全性”中允许。
   若提示“应用已损坏，无法打开”：

```bash
sudo xattr -dr com.apple.quarantine "/Applications/DeepSeek Harness.app"
```

> 0.1.3 起安装器会补上 `ElectronAsarIntegrity` 与 entitlements 两步；0.1.4 起还会注册 LaunchAgent 后台自动修复（每 20 秒检查一次）。已在 macOS（DSH Desktop 0.2.2-rc.3 / 0.2.2-rc.5 / Apple silicon）验证安装、启动与自动重打。
> 任何一步失败时安装器都会停在“已备份、未修改/未写入”的状态，不会把应用写坏；把终端输出发到 issue 即可。

---

## 4. 安装后验证

打开应用后确认：

1. 侧边栏“新会话”上方有一行 Profile（默认显示“默认”）；
2. 点 `＋` 能打开“切换 Profile”弹窗；
3. 新建一个 Profile（名称如 `work`，显示名如“工作”）→ 自动切换；
4. 再次打开弹窗 → 能看到两个 Profile，可切回“默认”；
5. 切换前后，`~/.dsh/desktop-profiles/` 下会出现新目录：

```
~/.dsh/desktop-profiles/
├─ registry.json
└─ work/
   ├─ meta.json
   └─ home/          ← 该 Profile 的独立 DSH_HOME（会话、凭据、插件都在这里）
```

Windows 路径：`C:\Users\<你>\.dsh\desktop-profiles\`；macOS：`~/.dsh/desktop-profiles/`。

---

## 5. 日常启动（重要）

| 系统 | 推荐入口 |
|---|---|
| Windows | **DeepSeek Harness (Profiles)** 快捷方式，或 `Launch-Windows.cmd` |
| macOS | `launch-macos.command`（可拖到 Dock） |

启动器会在启动前检查补丁；此外系统里还有后台自动修复：

| 系统 | 自动修复 | 日志 |
|---|---|---|
| Windows | 启动文件夹 watcher（60 秒） | `%LOCALAPPDATA%\dsh-desktop-profiles\repair.log` |
| macOS | LaunchAgent `com.dsh.desktop-profiles.repair`（20 秒） | `~/Library/Logs/dsh-desktop-profiles/repair.log` |

DSH 更新覆盖 `app.asar` 后，后台会用新 asar 现场重建补丁并重签；**修复完成后重启一次应用**即可看到 Profile 行。如果新版外壳结构变化导致锚点失效，修复会失败但保持官方界面，不会写坏应用。

---

## 6. 卸载 / 回滚

| 系统 | 操作 |
|---|---|
| Windows | 双击 `Uninstall-Windows.cmd`（或 `windows\Uninstall.cmd`） |
| macOS | `./uninstall-macos.command`（或 `macos/uninstall.command`） |

- 恢复官方 `app.asar` 并重新签名/重启；
- **Profile 数据不会删除**，仍在 `~/.dsh/desktop-profiles`；
- 想彻底清除：卸载后手动删除该目录。

---

## 7. 升级本插件

1. 下载新版本压缩包；
2. 重新运行对应系统的安装（覆盖安装是幂等的，会保留官方备份）；
3. 重启应用即可。

> 不需要先卸载。旧版本的 `app.asar.previous` 会保留，便于排查。

---

## 8. 常见问题

### Windows

| 现象 | 处理 |
|---|---|
| 双击后一闪而过 | 右键 → 以管理员身份运行；或先看是否被杀毒软件拦截 |
| `could not find DeepSeek Harness` | 指定路径：`Install-Windows.cmd "D:\DSH"` |
| `cannot replace app.asar` | 应用没完全退出：任务管理器结束“DeepSeek Harness”后重试 |
| 装完没有 Profile 行 | 确认重启过应用；确认用的是打了补丁的安装目录 |
| 想恢复原版 | 运行 `Uninstall-Windows.cmd` |

### macOS

| 现象 | 处理 |
|---|---|
| 双击 `.command` 没反应 | `chmod +x *.command` 后再试，或终端执行 `./install-macos.command` |
| 没有写权限 | 把 app 拖到 `~/Applications`，或 `sudo ./install-macos.command` |
| “应用已损坏，无法打开” | `sudo xattr -dr com.apple.quarantine "/Applications/DeepSeek Harness.app"` |
| `unsupported DSH build` | 版本不匹配；在 Mac 上重跑安装（会用本机 asar 重新构建） |
| 构建阶段报 `anchor not found` | 新版 DSH 外壳代码变化；保留终端输出并反馈，等适配版 |
| 恢复原版 | `./uninstall-macos.command` |

---

## 9. 数据与隔离

| 数据 | 是否按 Profile 隔离 |
|---|---|
| 会话历史、定时任务 | ✅ |
| 账号 / API 凭据 | ✅（新建时默认复制当前凭据，可关闭） |
| 插件、bundle、模型配置 | ✅ |
| UI 设置、附件、语音模型、缓存 | ✅ |
| Electron 缓存、更新记录 | ❌ 全局共享 |
| 平台网站 cookie、Web 前端 localStorage | ❌ 共享（会话与账号凭据已隔离） |

默认 Profile 使用原 `~/.dsh`，**不做迁移**。

---

## 10. 分发包结构

```
dsh-desktop-profiles/
├─ Install-Windows.cmd / Launch-Windows.cmd / Repair-Windows.cmd / Uninstall-Windows.cmd
├─ install-macos.command / launch-macos.command / uninstall-macos.command
├─ windows/
│  ├─ Install.cmd / Launch.cmd / Repair.cmd / Uninstall.cmd
│  ├─ installer/      # repair / deploy / revert / asar / ps1 / watcher
├─ macos/
│  ├─ install.command / launch.command / uninstall.command
│  ├─ installer/      # deploy / revert / asar / macos-sign
│  ├─ agent/          # 后台自动修复（LaunchAgent）
│  ├─ src/            # 补丁源码（两个平台共用的 patch 源）
│  └─ tools/          # build.mjs / asar.mjs
├─ plugin/            # DSH bundle 载体（状态检测，可选）
├─ docs/              # 截图与预览
├─ README.md / INSTALL.md / CHANGELOG.md / VERSION / LICENSE
```

> Release 里下载的 `dsh-desktop-profiles-<version>-all.zip` 与仓库是同一套目录（差异仅在 `.git` 与构建产物）。

---

## 11. 安全与边界

- 安装器只修改 `app.asar`（以及备份 `app.asar.stock` / `app.asar.previous`），不改系统设置、不装服务；
- macOS 修改后为 **ad-hoc 签名**：仅供本机使用，**不要分发修改后的 .app**；
- 分发包不包含任何官方二进制（无 `app.asar` 等），只包含补丁源码/脚本；
- 补丁绑定 DSH Desktop 0.2.2-rc.3；DSH 升级后需要匹配版本的补丁（自愈启动器会在有匹配补丁时自动重打，否则保持官方界面并记录日志）；
- Windows 日志：`%LOCALAPPDATA%\dsh-desktop-profiles\repair.log`；macOS 安装输出直接显示在终端。
