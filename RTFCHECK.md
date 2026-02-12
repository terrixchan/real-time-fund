---
name: rtfcheck
description: 微信小程序 real-time-fund 项目上传前检查与部署流程。用户提到“微信开发者工具上传前检查”“云函数部署”“环境 ID 校验”“冒烟测试”“发布前自检”时使用。
---

# RTFCHECK

按顺序执行以下步骤，完成 real-time-fund 的上传前检查与部署。

## 1. 确认 Git 状态

执行：

```bash
git status --short --branch
git log -1 --oneline --decorate
```

检查项：
- 工作区无未提交改动。
- `main` 与 `origin/main` 同步。

## 2. 校验微信项目配置

检查文件：`project.config.json`

必须满足：
- `miniprogramRoot` 为 `miniprogram/`
- `cloudfunctionRoot` 为 `cloudfunctions/`
- `cloudbaseEnvId` 与小程序初始化环境一致
- `appid` 为目标小程序的 appid

## 3. 校验云环境 ID 一致性

检查文件：`miniprogram/app.js` 与 `project.config.json`

必须满足：
- `wx.cloud.init({ env: ... })` 中的 `env` 与 `cloudbaseEnvId` 完全一致。

## 4. 校验云函数结构

执行：

```bash
ls -la cloudfunctions
rg --files cloudfunctions
```

检查项：
- `cloudfunctions/fundProxy/index.js` 存在。
- `cloudfunctions/fundProxy/package.json` 的 `main` 指向 `index.js`。

## 5. 校验调用链路

执行：

```bash
rg -n "wx.cloud.callFunction|name:\\s*'fundProxy'|cloud\\.init|env:" miniprogram -g "*.js"
```

检查项：
- 小程序侧调用 `name: 'fundProxy'`。
- 云函数目录名与调用名一致（均为 `fundProxy`）。

## 6. 微信开发者工具部署动作

在微信开发者工具中执行：
- 选择正确项目根目录并完成编译。
- 对 `fundProxy` 执行“上传并部署：云端安装依赖”。
- 重新编译并观察控制台日志。

通过标准：
- 出现 `[boot] cloud init ok`。
- 触发基金查询时无 `wx.cloud not available`、`empty cloud result` 等错误。

## 7. 上传前冒烟测试

至少执行：
- 打开首页后能正常渲染。
- 手动触发一次基金查询，返回字段含 `name`、`gsz`、`gztime`、`gszzl`（或兼容映射后可用）。
- 断网/异常时有可见错误提示，不出现白屏。

## 8. 上传发布

建议先做发布前快照：

```bash
git add -A
git commit -m "chore: pre-upload checkpoint"
```

然后在微信开发者工具执行“上传”。

## 9. 故障定位顺序

出现问题时按以下顺序排查：
1. `env` 是否一致。
2. 云函数是否已部署成功且名称一致。
3. `fundProxy` 返回结构是否被 `miniprogram/utils/fund.js` 正常解包。
4. 小程序本地缓存是否导致旧配置生效（清缓存后重试）。
