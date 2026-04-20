#!/usr/bin/env node
/**
 * 初始化管理员密码脚本
 * 运行：node init-admin.js
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const envPath = path.join(__dirname, '.env');

console.log('🔐 LensView 管理员密码初始化\n');

// 检查 .env 文件是否存在
if (!fs.existsSync(envPath)) {
    console.log('📁 创建 .env 文件...');
    const template = fs.readFileSync(path.join(__dirname, '.env.example'), 'utf8');
    
    // 生成随机 JWT 密钥
    const jwtSecret = crypto.randomBytes(32).toString('hex');
    const updated = template
        .replace('JWT_SECRET=your-super-secret-jwt-key-change-this-in-production', `JWT_SECRET=${jwtSecret}`)
        .replace('ADMIN_PASSWORD_HASH=', 'ADMIN_PASSWORD_HASH=');
    
    fs.writeFileSync(envPath, updated);
    console.log('✅ .env 文件已创建\n');
}

// 读取配置
require('dotenv').config({ path: envPath });

rl.question('请输入管理员用户名（默认 admin）: ', (username) => {
    const adminUser = username.trim() || 'admin';
    
    rl.question('请输入管理员密码: ', (password) => {
        if (password.length < 6) {
            console.log('❌ 密码长度至少 6 位');
            rl.close();
            return;
        }
        
        rl.question('请确认密码：', (confirm) => {
            if (password !== confirm) {
                console.log('❌ 两次输入的密码不一致');
                rl.close();
                return;
            }
            
            // 生成密码哈希
            const salt = bcrypt.genSaltSync(12);
            const hash = bcrypt.hashSync(password, salt);
            
            // 更新 .env 文件
            let envContent = fs.readFileSync(envPath, 'utf8');
            envContent = envContent.replace(/ADMIN_USERNAME=.*/, `ADMIN_USERNAME=${adminUser}`);
            envContent = envContent.replace(/ADMIN_PASSWORD_HASH=.*/, `ADMIN_PASSWORD_HASH=${hash}`);
            
            fs.writeFileSync(envPath, envContent);
            
            console.log('\n✅ 管理员账号初始化成功！\n');
            console.log(`👤 用户名：${adminUser}`);
            console.log(`🔑 密码哈希：${hash.substring(0, 20)}...`);
            console.log(`\n📁 配置文件：${envPath}`);
            console.log('\n⚠️  请妥善保管 .env 文件，不要提交到版本控制！\n');
            console.log('现在可以运行 npm start 启动服务器\n');
            
            rl.close();
        });
    });
});
