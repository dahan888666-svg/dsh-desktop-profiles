# Desktop Profiles

侧边栏 Profile 行、独立数据目录、同窗口切换。

## 安装

1. 运行 `installer/Install.cmd`（可带安装目录参数）。
2. 按提示关闭应用；安装器备份并替换 `app.asar` 后自动重启。
3. 重启后侧边栏“新会话”上方出现 Profile 行。

## 回滚

`installer/Uninstall.cmd` 恢复官方 `app.asar`；Profile 数据保留。

## 边界

- 只支持 DSH Desktop 0.2.2-rc.3；升级后需重新构建补丁。
- 同一时刻一个窗口；Profile 通过切换访问。
- 插件与配置按 Profile 隔离，新 Profile 需单独安装插件。
- 平台网站 cookie 与 Web 前端 localStorage 仍共享；会话与账号凭据已隔离。
