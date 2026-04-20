# LensView - 高品质照片社区

一个现代化的照片分享社区平台，支持图片上传、分类存储和在线浏览。

## 📁 存储结构

图片存储在 `/home/test` 目录，按主题分类：

```
/home/test/
├── 人像/
│   ├── img_1776415352881_abc123.jpg
│   └── img_1776415391515_def456.jpg
├── 风景/
├── 城市/
├── 美食/
└── ...
```

## 🚀 快速开始

### 1. 安装依赖

```bash
cd /root/.openclaw/workspace/lensview
npm install
```

### 2. 启动服务器

```bash
npm start
# 或开发模式
npm run dev
```

### 3. 访问应用

打开浏览器访问：http://localhost:3000

## 📡 API 接口

### 上传照片
```
POST /api/upload
Content-Type: multipart/form-data

参数:
- photo: 图片文件 (必填)
- category: 分类 (必填) - 人像/风景/城市/自然/动物/建筑/美食
- title: 标题 (必填)
- description: 描述 (可选)
- tags: 标签 (可选)
- allowDownload: 允许下载 (可选)

响应:
{
  "success": true,
  "data": {
    "url": "/images/风景/img_xxx.jpg",
    "filename": "img_xxx.jpg",
    "category": "风景",
    "size": 12345,
    "path": "/home/test/风景/img_xxx.jpg"
  }
}
```

### 获取分类列表
```
GET /api/categories

响应:
{
  "categories": ["人像", "风景", "城市", ...]
}
```

### 获取某分类下的图片
```
GET /api/images/:category

响应:
{
  "images": [
    {
      "filename": "img_xxx.jpg",
      "url": "/images/风景/img_xxx.jpg",
      "path": "/home/test/风景/img_xxx.jpg"
    }
  ]
}
```

## ✅ Bug 修复

1. **文件流错误处理** - 添加了完整的错误处理
2. **文件名安全** - 使用唯一文件名避免冲突
3. **文件验证** - 只允许 JPG/PNG/GIF 格式
4. **大小限制** - 最大 20MB
5. **分类目录自动创建** - 按需创建分类目录
6. **CORS 支持** - 允许跨域访问

## 🛠️ 技术栈

- **后端**: Node.js + Express
- **文件上传**: Multer
- **前端**: HTML5 + TailwindCSS + Vanilla JS
- **图表**: Chart.js
- **图标**: Font Awesome

## 📝 注意事项

1. 确保 `/home/test` 目录有写入权限
2. 生产环境建议使用 Nginx 反向代理
3. 建议配置 HTTPS
4. 大文件上传可能需要调整服务器超时设置
