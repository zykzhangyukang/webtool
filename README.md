# WebTool

个人在线开发者工具站,基于 Vue 3 + Bootstrap 5,部署在 Cloudflare Worker,数据存放在 D1。所有工具都在浏览器里运行,需要登录后使用。

## 功能

- 工具:JSON 格式化、时间戳转换、文本编辑器(开源 Monaco,浅色,F1 命令面板含转 SQL 列表等文本处理)。
- 账号:首个注册用户成为管理员,之后注册关闭,由管理员创建用户。
- 权限:管理员可按工具给用户分配权限,设置到期时间,停用或删除用户。
- 安全:PBKDF2 密码哈希,会话只存哈希,登录失败限流,审计日志保留 7 天。
- 设备:用户可查看并踢出自己的登录设备,管理员可查看全站会话。
- 命令面板:`Ctrl K` 搜索工具,方向键选择,回车进入。

## 技术栈

- 前端:Vue 3、vue-router、Bootstrap 5、Vite
- 后端:Cloudflare Worker、D1

## 本地开发

需要 Node 22 以上(Vite 8 的要求)。开两个终端:

```bash
npm install
npx wrangler d1 execute webtool --local --file=schema.sql   # 首次初始化本地库
npx wrangler dev --port 8787   # 终端 1:Worker + 本地 D1
npm run dev   # 终端 2:前端,访问 http://localhost:5173
```

本地开发用 Miniflare 模拟的 D1,`wrangler.jsonc` 里的 `database_id` 不影响本地运行。fork 本项目时请换成自己的 ID。

## 部署

```bash
npx wrangler d1 create webtool   # 创建库,把 database_id 填进 wrangler.jsonc
npx wrangler d1 execute webtool --remote --file=schema.sql   # 首次建表
npm run deploy   # 构建并部署
```

部署后立即访问站点注册管理员账号。

升级已有线上库时,先执行 `migrations/` 里新增的迁移(只执行一次),再部署:

```bash
npx wrangler d1 execute webtool --remote --file=migrations/002_session_devices.sql
npm run deploy
```

## 目录结构

```text
src/     前端(router、auth、views、tools)
src/tools/      工具注册表与纯逻辑
worker/         Worker 接口(index、auth、admin)
migrations/     D1 迁移脚本
schema.sql      完整表结构
wrangler.jsonc  Worker、静态资源与 D1 绑定
```

## 新增工具

1. 在 `src/views/tools/` 新建 `XxxTool.vue`。
2. 在 `src/tools/registry.js` 添加条目,路由和搜索会自动生效。
3. 管理员授权列表里需要的工具 ID,同步到 `worker/admin.js` 的 `TOOL_IDS`。

更多约定见 [AGENTS.md](AGENTS.md)。




