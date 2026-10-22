# 模块化改造部署说明

## 目录变化

新增/调整：
- `backend/server.js`：只负责 Express 初始化和挂载路由。
- `backend/routes/authRoutes.js`：登录和当前用户信息。
- `backend/routes/userRoutes.js`：管理员注册/删除普通用户。
- `backend/routes/fileRoutes.js`：管理员上传/列出/删除知识库源文件。
- `backend/routes/chatRoutes.js`：聊天与清空记忆接口。
- `backend/services/authService.js`、`backend/services/chatService.js`：业务逻辑。
- `backend/security/passwords.js`、`backend/security/tokens.js`：密码哈希与签名令牌。
- `backend/middleware/auth.js`：登录验证和管理员权限验证。
- `src/components/`：登录、聊天、后台管理页面分别独立。
- `src/lib/api.js`：统一处理 API 请求和登录 token。
- `backend/database.js`：保留现有 `chat_messages` 表定义，新增 `users` 表。

原有 `search.js`、`chatMemory.js`、`tools/`、`embedding.js`、`lancedb.js`、`build-index.js` 不要覆盖。

## 部署步骤

1. 先进入项目目录并备份：
   ```bash
   cd ~/prod-app
   cp backend/server.js backend/server.js.bak
   cp backend/database.js backend/database.js.bak
   cp src/App.jsx src/App.jsx.bak
   cp chat_memory.db chat_memory.db.bak
   ```
2. 将压缩包内文件按目录结构上传/解压到 `~/prod-app`，覆盖同名的 `backend/server.js`、`backend/database.js`、`src/App.jsx`，并新增其余文件。不要覆盖 `.env` 和原有 RAG/tool 文件。
3. 确保 `.env` 包含以下设置，值请换成真实值：
   ```env
   AUTH_SECRET=至少32字符的随机密钥
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=这里填写你自己生成的强密码
   ```
   生成随机密钥/初始密码可用 `openssl rand -hex 32`。不要把密钥发到聊天或提交到 Git。
4. `ADMIN_PASSWORD` 仅在该用户名尚未存在时用于首次创建管理员。若管理员已存在，修改 `.env` 不会重置数据库密码；需要单独执行密码重置逻辑。
5. 检查 PM2 实际工作目录及入口后构建、重启：
   ```bash
   npm run build
   pm2 restart prod-backend --update-env
   pm2 logs prod-backend --lines 80
   ```
   如果构建失败，不要继续重启；先看错误并恢复备份。
6. 浏览器检查登录。初始管理员使用 `.env` 中的 `ADMIN_USERNAME` 和首次初始化时的 `ADMIN_PASSWORD`。管理员可创建普通用户；普通用户只能聊天。

## API 路由
- `POST /auth/login`
- `GET /auth/me`
- `GET /admin/users`、`POST /admin/users`、`DELETE /admin/users/:id`
- `GET /admin/files`、`POST /admin/files`、`DELETE /admin/files/:filename`
- `POST /ask`、`POST /clear-memory`
- `GET /health`

前端默认访问 `/api` 前缀，因此现有反向代理需要把 `/api/auth/login` 转发到后端 `/auth/login`（去掉 `/api` 前缀），并同样处理其他 API。如果当前代理不是这样配置，先调整代理或设置正确的 `VITE_API_BASE_URL`，再重新 `npm run build`。

## 重要说明
- 上传/删除只操作 `backend/knowledge` 里的源文件。现有 LanceDB 索引不会自动更新；请按项目原有的 `build-index.js` 流程更新索引，否则新文件可能查不到、删除的文件内容可能仍出现在检索结果。
- 这里的会话 ID 仍由浏览器保存；本版本将 API 限制为已登录用户，但尚未把会话记录与用户 ID 绑定。若要严格隔离每个用户的历史记录，应进一步给 chat session 增加用户归属校验。
- 请在 HTTPS 下使用，并轮换已经泄露过的 API keys / AUTH_SECRET。
