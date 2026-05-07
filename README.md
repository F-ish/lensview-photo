# LensView - 高品质照片展示平台

一个安全、现代化的照片展示社区平台，支持图片上传、分类存储、在线浏览和权限管理。

## 🌟 核心特性

- **📸 照片展示** - 高品质图片浏览，支持多分类管理
- **🔐 安全认证** - JWT Token 认证，管理员权限控制
- **📁 分类存储** - 按主题自动分类（人像/风景/城市/自然/动物/建筑/美食）
- **🛡️ 安全加固** - 文件类型验证、防路径穿越、CORS 控制
- **🎨 前端美学** - 现代化 UI 设计，响应式布局
- **🚀 性能优化** - 图片懒加载、缓存优化

---

## 🏗️ 项目结构

```
lensview/
├── server.js              # 主服务器（Express + 安全中间件）
├── server-secure.js       # 安全加固版服务器
├── index.html             # 前端主页面
├── middleware/
│   └── auth.js            # JWT 认证中间件
├── photos/                # 照片存储目录
│   ├── 人像/
│   ├── 风景/
│   ├── 城市/
│   └── ...
├── .env                   # 环境变量配置
├── .env.example           # 环境变量示例
├── package.json           # 依赖配置
├── nginx.conf             # Nginx 配置（生产环境）
└── README.md              # 项目文档
```

---

## 🚀 快速开始

### 1. 环境要求

- Node.js >= 16.x
- npm >= 8.x

### 2. 安装依赖

```bash
cd /root/.openclaw/workspace/lensview
npm install
```

### 3. 初始化管理员账号

首次运行需要设置管理员账号和 JWT 密钥：

```bash
npm run init
```

这会生成 `.env` 文件，包含：
- `ADMIN_USERNAME` - 管理员用户名
- `ADMIN_PASSWORD_HASH` - 加密后的密码
- `JWT_SECRET` - JWT 签名密钥
- `PORT` - 服务端口（默认 3000）
- `HOST` - 监听地址（默认 127.0.0.1）

### 4. 启动服务器

```bash
# 生产模式
npm start

# 开发模式（自动重启）
npm run dev
```

### 5. 访问应用

打开浏览器访问：http://localhost:3000

---

## 📡 API 接口

### 🔐 认证接口

#### 管理员登录
```http
POST /api/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your_password"
}

响应:
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "username": "admin",
      "role": "admin"
    },
    "expiresIn": 604800
  }
}
```

#### 验证 Token
```http
GET /api/auth/verify
Authorization: Bearer <token>

响应:
{
  "valid": true,
  "user": {
    "username": "admin",
    "role": "admin"
  }
}
```

#### 登出
```http
POST /api/logout

响应:
{
  "success": true,
  "message": "已登出"
}
```

---

### 📸 图片接口

#### 上传图片（需管理员权限）
```http
POST /api/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

参数:
- photo: 图片文件 (必填，JPG/PNG/GIF，最大 20MB)
- category: 分类 (可选，默认 uncategorized)

响应:
{
  "success": true,
  "data": {
    "url": "/images/风景/img_1777955289221_abc123.jpg",
    "filename": "img_1777955289221_abc123.jpg",
    "category": "风景",
    "size": 1234567
  }
}
```

#### 获取分类列表（公开）
```http
GET /api/categories

响应:
{
  "categories": ["人像", "风景", "城市", "自然", "动物", "建筑", "美食", "uncategorized"]
}
```

#### 获取某分类下的图片（公开）
```http
GET /api/images/:category

响应:
{
  "images": [
    {
      "filename": "img_xxx.jpg",
      "url": "/images/风景/img_xxx.jpg"
    }
  ]
}
```

#### 删除图片（需管理员权限）
```http
DELETE /api/images/:category/:filename
Authorization: Bearer <token>

响应:
{
  "success": true,
  "message": "删除成功"
}
```

---

## 🛡️ 安全特性

### 1. 认证与授权
- ✅ JWT Token 认证（7 天有效期）
- ✅ 管理员权限验证
- ✅ 密码 bcrypt 加密存储

### 2. 文件安全
- ✅ 文件类型验证（MIME + file 命令双重验证）
- ✅ 文件大小限制（最大 20MB）
- ✅ 安全文件名生成（时间戳 + 随机数）
- ✅ 防路径穿越（分类名白名单过滤）

### 3. 网络安全
- ✅ CORS 配置（可配置允许来源）
- ✅ 安全响应头（X-Content-Type-Options: nosniff）
- ✅ 禁止爬虫索引图片（X-Robots-Tag: noindex）
- ✅ 监听地址可配置（默认 127.0.0.1）

### 4. 权限控制
- ✅ 公开浏览，管理员上传/删除
- ✅ 文件权限控制（0o640）
- ✅ 目录权限控制（0o750）

---

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| **后端** | Node.js + Express |
| **认证** | JWT + bcryptjs |
| **文件上传** | Multer |
| **前端** | HTML5 + TailwindCSS + Vanilla JS |
| **图表** | Chart.js |
| **图标** | Font Awesome |
| **反向代理** | Nginx（生产环境） |

---

## 📦 依赖列表

```json
{
  "express": "^4.18.2",
  "multer": "^1.4.5-lts.1",
  "cors": "^2.8.5",
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^2.4.3",
  "dotenv": "^16.3.1",
  "nodemon": "^3.0.1"
}
```

---

## 🔧 生产环境部署

### 1. Nginx 反向代理

使用提供的 `nginx.conf` 配置：

```bash
sudo cp nginx.conf /etc/nginx/sites-available/lensview
sudo ln -s /etc/nginx/sites-available/lensview /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 2. Systemd 服务

使用提供的 `lensview.service`：

```bash
sudo cp lensview.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable lensview
sudo systemctl start lensview
```

### 3. 防火墙配置

运行防火墙设置脚本：

```bash
sudo ./setup-firewall.sh
```

---

## 📝 开发指南

### 添加新分类

在 `server.js` 中修改 `ALLOWED_CATEGORIES`：

```javascript
const ALLOWED_CATEGORIES = ['人像', '风景', '城市', '自然', '动物', '建筑', '美食', 'uncategorized', '新分类'];
```

### 修改文件上传限制

```javascript
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
```

### 调整 Token 有效期

```javascript
jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' }); // 30 天
```

---

## 🐛 已知问题与修复

详见 [Bug 修复记录.md](./Bug%20修复记录.md)

### 已修复
- ✅ 文件流错误处理
- ✅ 文件名冲突问题
- ✅ CORS 跨域配置
- ✅ 登录状态持久化
- ✅ 图片预览功能
- ✅ 浮世绘海浪动画

---

## 📚 相关文档

- [部署说明.md](./部署说明.md) - 详细部署步骤
- [SECURITY.md](./SECURITY.md) - 安全策略
- [公网安全检查清单.md](./公网安全检查清单.md) - 公网部署检查
- [功能更新说明.md](./功能更新说明.md) - 版本更新日志

---

## 📄 许可证

MIT License

---

## 👨‍💻 维护者

LensView Team

**最后更新：** 2026-05-05
