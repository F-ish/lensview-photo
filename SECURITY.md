# LensView 安全加固清单

## ✅ 已完成配置

### 1. Nginx 安全配置
- [x] 隐藏服务器版本 (`server_tokens off`)
- [x] 添加安全响应头 (XSS、点击劫持防护)
- [x] 配置限流 (`limit_req`, `limit_conn`)
- [x] 限制请求大小 (`client_max_body_size`)
- [x] 禁止访问敏感文件 (`.git`, `.env` 等)
- [x] 图片目录禁止脚本执行

### 2. 后端安全加固
- [x] 使用 `crypto` 生成安全文件名
- [x] 二次验证文件真实性 (`file` 命令)
- [x] 清理分类名防止路径穿越
- [x] 限制 JSON 请求大小
- [x] 设置安全的文件权限 (0o640)
- [x] 仅监听 127.0.0.1（通过 Nginx 代理）
- [x] 添加健康检查端点

### 3. 文件上传安全
- [x] 扩展名白名单
- [x] MIME 类型验证
- [x] Magic Number 二次验证
- [x] 文件大小限制 (20MB)
- [x] 单文件上传限制

---

## 🔧 待实施建议

### 1. 启用 HTTPS（重要）
```bash
# 使用 Let's Encrypt 免费证书
sudo certbot --nginx -d yourdomain.com
```

### 2. 配置防火墙
```bash
# 只开放必要端口
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 3. 日志监控
```bash
# 查看异常上传
sudo tail -f /var/log/nginx/lensview_access.log | grep "POST /api/upload"

# 监控错误日志
sudo tail -f /var/log/nginx/lensview_error.log
```

### 4. 定期安全更新
```bash
# 系统更新
sudo dnf update -y

# Node.js 依赖检查
cd /root/.openclaw/workspace/lensview
npm audit
npm audit fix
```

### 5. 备份策略
```bash
# 创建备份脚本
cat > /root/.openclaw/workspace/lensview/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/lensview/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR
cp -r /root/.openclaw/workspace/lensview/photos $BACKUP_DIR/
echo "备份完成：$BACKUP_DIR"
EOF
chmod +x /root/.openclaw/workspace/lensview/backup.sh

# 添加到 crontab（每天凌晨 2 点）
0 2 * * * /root/.openclaw/workspace/lensview/backup.sh
```

### 6. 用户认证（可选）
如需用户系统，建议添加：
- JWT 身份验证
- 图片上传配额限制
- 用户权限管理

---

## 📊 安全测试

### 测试限流
```bash
# 快速发送多个请求
for i in {1..50}; do curl -s http://localhost/health > /dev/null; done
# 应该看到 429 错误
```

### 测试文件上传
```bash
# 正常上传
curl -X POST http://localhost/api/upload \
  -F "photo=@test.jpg" \
  -F "category=风景"

# 尝试上传恶意文件（应被拒绝）
curl -X POST http://localhost/api/upload \
  -F "photo=@malicious.php" \
  -F "category=风景"
```

### 测试路径穿越
```bash
# 尝试访问敏感文件（应返回 404）
curl http://localhost/.env
curl http://localhost/.git/config
```

---

## 🚀 应用安全配置

### 部署安全版 Nginx 配置
```bash
sudo cp /root/.openclaw/workspace/lensview/nginx-secure.conf /etc/nginx/conf.d/lensview.conf
sudo nginx -t && sudo systemctl reload nginx
```

### 部署安全版后端
```bash
# 先安装依赖
cd /root/.openclaw/workspace/lensview
npm install file-type

# 备份原文件
cp server.js server.js.bak

# 替换为安全版本
cp server-secure.js server.js

# 重启服务
# 找到进程并重启
pkill -f "node server.js"
nohup node server.js > lensview.log 2>&1 &
```

---

## 📝 安全最佳实践

1. **最小权限原则** - 只开放必要的端口和权限
2. **纵深防御** - 多层验证（MIME + Magic Number + 扩展名）
3. **默认拒绝** - 白名单优于黑名单
4. **日志审计** - 定期检查异常访问
5. **定期更新** - 保持系统和依赖最新
6. **备份恢复** - 定期备份，测试恢复流程
