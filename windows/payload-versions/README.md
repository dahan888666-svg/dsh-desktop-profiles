# payload-versions

按 DSH Desktop 版本放置适配补丁，供启动器自动选择：

```
payload-versions\
  0.2.3\            # 目录名 = DSH 版本（读取 resources/app.asar 的 package.json version）
    dsh-profile-patch.json
    lib\main.js ...
```

规则：

- `dsh-profile-patch.json` 必须包含 `desktopVersion` 与 `stockMainSha256`；
- 启动器先匹配 `payload\`（默认，对应本发布包的目标版本），不匹配时再找 `payload-versions\<当前版本>\`；
- 找不到匹配项时**不会打补丁**：应用正常运行（官方界面），原因写入
  `%LOCALAPPDATA%\dsh-desktop-profiles\repair.log`。

适配新版本的流程见仓库根目录 `README.md` 的「发布到 GitHub」一节。
