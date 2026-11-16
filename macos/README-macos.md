# macOS 安装说明

> 状态：**实验性**。已在 macOS（DSH Desktop 0.2.2-rc.3 / Apple silicon）验证安装与启动；
> 首次安装仍建议按下面的“安装后验证”确认关键路径。

## 前提

- 已安装 DeepSeek Harness 桌面端（通常位于 `/Applications/DeepSeek Harness.app`，也支持 `~/Applications`）；
- 目标版本与补丁匹配（当前为 **0.2.2-rc.3**）。版本不一致时安装器会拒绝，并提示重新构建。

## 安装

1. 解压本包；
2. 打开“终端”，进入解压目录，执行一次：

```bash
chmod +x *.command
```

3. 双击 `install.command`（首次如被拦，右键 → 打开）。
   它会：
   - 退出 DeepSeek Harness；
   - 备份官方 `Contents/Resources/app.asar` 为 `app.asar.stock`；
   - **用你机器上的官方 app.asar 现场构建补丁**（避免跨平台哈希不一致）；
   - 替换 `app.asar`，同步 `Info.plist` 的 `ElectronAsarIntegrity` 哈希；
   - 沿用原 bundle 的 hardened runtime 与 entitlements 做 ad-hoc 重签名（只签主 bundle，不 `--deep`）；
   - 执行 `codesign --verify` 校验签名；
   - 重新打开应用。

4. 打开后，侧边栏“新会话”上方出现 Profile 行。

如果安装到 `/Applications` 时提示没有写权限：把 app 拖到 `~/Applications`，或 `sudo ./install.command`。

## 日常启动与升级

- 用 `launch.command` 启动（可拖到 Dock）：它会检查补丁，DSH 更新覆盖后自动重建并重打；
- DSH 更新后如果直接点了官方图标，可能先看到官方界面，用 `launch.command` 再开一次即可恢复；
- 本包需要保留 `src/` 与 `tools/`（`launch.command` 依赖它们现场构建补丁）。

## 卸载

双击 `uninstall.command`：恢复官方 `app.asar` 并重新签名。Profile 数据在 `~/.dsh/desktop-profiles`，不受影响。

## 常见问题

| 现象 | 处理 |
|---|---|
| “应用已损坏，无法打开” | `sudo xattr -dr com.apple.quarantine "/Applications/DeepSeek Harness.app"`，或右键 → 打开 |
| 提示 `unsupported DSH build` | DSH 版本与补丁不匹配；在 Mac 上重跑 `install.command`（会用本机 app.asar 重新构建）；仍失败说明锚点变化，需要更新适配 |
| 没有写权限 | 把 app 放到 `~/Applications`，或 `sudo ./install.command` |
| 双击 `.command` 没反应 | 先 `chmod +x *.command`；或在终端执行 `./install.command` |
| 安装后签名/权限异常 | 重新运行 `install.command`（会重算 `ElectronAsarIntegrity` 并按原 entitlements 重签）；或 `sudo xattr -dr com.apple.quarantine "/Applications/DeepSeek Harness.app"` |

## 说明

修改 `app.asar` 会使官方 Developer ID 签名失效，安装器会做 ad-hoc 重新签名（仅本地可用，不能分发修改后的 app）。
0.1.3 起安装器会同步 `ElectronAsarIntegrity`，并保留原 hardened runtime / entitlements；卸载脚本同样会恢复哈希并重签。
补丁只改动外壳 JS 与共享侧边栏包，不包含任何官方二进制。
