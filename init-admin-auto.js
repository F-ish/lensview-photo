const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const envPath = path.join(__dirname, '.env');

console.log('🔐 LensView 管理员初始化\n');

// 生成随机 JWT 密钥
const jwtSecret = crypto.randomBytes(32).toString('hex');

// 生成默认密码哈希（默认密码：admin123）
const defaultPassword = 'admin123';
const salt = bcrypt.genSaltSync(12);
const passwordHash = bcrypt.hashSync(defaultPassword, salt);

// 读取并更新 .env 文件
let envContent = fs.readFileSync(envPath, 'utf8');
envContent = envContent.replace(/ADMIN_USERNAME=.*/, 'ADMIN_USERNAME=admin');
envContent = envContent.replace(/ADMIN_PASSWORD_HASH=.*/, `ADMIN_PASSWORD_HASH=${passwordHash}`);
envContent = envContent.replace(/JWT_SECRET=.*/, `JWT_SECRET=${jwtSecret}`);

fs.writeFileSync(envPath, envContent);

console.log('✅ 管理员账号初始化成功！\n');
console.log('👤 用户名：admin');
console.log('🔑 密码：admin123');
console.log('\n⚠️  首次登录后请尽快修改密码！\n');
console.log('📁 配置文件：' + envPath);
console.log('\n现在运行 npm start 启动服务器\n');
