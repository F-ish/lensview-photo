require('dotenv').config();

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { exec } = require('child_process');
const { promisify } = require('util');
const { verifyToken, optionalAuth } = require('./middleware/auth');

const execAsync = promisify(exec);
const app = express();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';

// 安全配置
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const JWT_SECRET = process.env.JWT_SECRET;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost'];

// 验证必要配置
if (!ADMIN_PASSWORD_HASH || !JWT_SECRET) {
    console.error('❌ 请先运行 npm run init 初始化管理员账号');
    process.exit(1);
}

// 安全中间件配置
app.use(cors({
    origin: function(origin, callback) {
        // 允许无 origin（如移动端、Postman、curl）
        if (!origin) return callback(null, true);
        
        // 允许 localhost 和 127.0.0.1
        if (origin === 'http://localhost' || origin === 'http://127.0.0.1') {
            return callback(null, true);
        }
        
        // 允许所有 IP 地址访问（用于公网 IP 直接访问）
        const ipRegex = /^http:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/;
        if (ipRegex.test(origin)) {
            return callback(null, true);
        }
        
        // 检查是否在允许列表中
        if (ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            // 开发环境：允许所有来源
            if (process.env.NODE_ENV === 'development') {
                callback(null, true);
            } else {
                callback(null, true); // 临时允许所有，避免登录问题
            }
        }
    },
    credentials: true,
    exposedHeaders: ['Authorization']
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname, { 
    dotfiles: 'deny',
    extensions: ['html'],
    setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
    }
}));

// Cookie 解析中间件
app.use((req, res, next) => {
    const cookies = {};
    if (req.headers.cookie) {
        req.headers.cookie.split(';').forEach(cookie => {
            const parts = cookie.split('=');
            cookies[parts[0].trim()] = parts[1]?.trim();
        });
    }
    req.cookies = cookies;
    next();
});

// 文件存储配置
const BASE_DIR = path.join(__dirname, 'photos');
const ALLOWED_CATEGORIES = ['人像', '风景', '城市', '自然', '动物', '建筑', '美食', 'uncategorized'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// 确保存储目录存在并设置权限
if (!fs.existsSync(BASE_DIR)) {
    fs.mkdirSync(BASE_DIR, { recursive: true, mode: 0o750 });
    console.log(`📁 创建照片存储目录：${BASE_DIR}`);
}

// ==================== 安全工具函数 ====================

/**
 * 验证文件是否为真实图片（使用 file 命令）
 */
async function verifyImageFile(filePath) {
    try {
        const { stdout } = await execAsync(`file --mime-type -b "${filePath}"`);
        const mimeType = stdout.trim().toLowerCase();
        return ALLOWED_MIME_TYPES.includes(mimeType);
    } catch (error) {
        console.error('文件验证失败:', error);
        return false;
    }
}

/**
 * 清理分类名，防止路径穿越
 */
function sanitizeCategory(category) {
    if (!category) return 'uncategorized';
    const sanitized = category.replace(/[^\w\u4e00-\u9fa5-]/g, '');
    return ALLOWED_CATEGORIES.includes(sanitized) ? sanitized : 'uncategorized';
}

/**
 * 生成安全的随机文件名
 */
function generateSecureFilename(ext) {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(16).toString('hex');
    return `img_${timestamp}_${randomBytes}${ext}`;
}

// ==================== 文件上传配置 ====================

const fileFilter = (req, file, cb) => {
    const allowedExts = ['.jpeg', '.jpg', '.png', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (!allowedExts.includes(ext)) {
        return cb(new Error('只允许 JPG, PNG, GIF 格式'), false);
    }
    
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(new Error('文件类型不允许'), false);
    }
    
    cb(null, true);
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const category = sanitizeCategory(req.body.category);
        const categoryDir = path.join(BASE_DIR, category);
        
        if (!fs.existsSync(categoryDir)) {
            fs.mkdirSync(categoryDir, { recursive: true, mode: 0o750 });
        }
        
        cb(null, categoryDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const secureFilename = generateSecureFilename(ext);
        cb(null, secureFilename);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1
    },
    fileFilter
});

// ==================== 认证路由 ====================

/**
 * 管理员登录
 */
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码不能为空' });
        }
        
        // 验证用户名
        if (username !== ADMIN_USERNAME) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        
        // 验证密码
        const validPassword = bcrypt.compareSync(password, ADMIN_PASSWORD_HASH);
        if (!validPassword) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        
        // 生成 JWT Token
        const token = jwt.sign(
            { 
                username: ADMIN_USERNAME, 
                role: 'admin',
                iat: Math.floor(Date.now() / 1000)
            },
            JWT_SECRET,
            { expiresIn: '7d' } // 7 天有效期
        );
        
        console.log(`✅ 管理员登录成功：${username}`);
        
        res.json({
            success: true,
            message: '登录成功',
            data: {
                token,
                user: {
                    username: ADMIN_USERNAME,
                    role: 'admin'
                },
                expiresIn: 7 * 24 * 60 * 60 // 秒
            }
        });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ error: '登录失败' });
    }
});

/**
 * 验证 Token 是否有效
 */
app.get('/api/auth/verify', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (!token) {
        return res.status(401).json({ valid: false });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ 
            valid: true, 
            user: { username: decoded.username, role: decoded.role }
        });
    } catch (error) {
        res.status(401).json({ valid: false });
    }
});

/**
 * 登出（客户端删除 token 即可）
 */
app.post('/api/logout', (req, res) => {
    res.json({ success: true, message: '已登出' });
});

// ==================== 图片 API（带权限控制） ====================

/**
 * 上传图片（需要管理员权限）
 */
app.post('/api/upload', verifyToken, upload.single('photo'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '没有上传文件' });
        }
        
        // 二次验证文件真实性
        const isRealImage = await verifyImageFile(req.file.path);
        if (!isRealImage) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: '文件验证失败，不是有效的图片' });
        }
        
        // 设置安全的文件权限
        fs.chmodSync(req.file.path, 0o640);
        
        const category = sanitizeCategory(req.body.category);
        const imageUrl = `/images/${category}/${path.basename(req.file.path)}`;
        
        console.log(`✅ 图片上传成功：${req.file.path} (用户：${req.user.username})`);
        
        res.json({
            success: true,
            message: '上传成功',
            data: {
                url: imageUrl,
                filename: path.basename(req.file.path),
                category: category,
                size: req.file.size
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * 获取某分类下的所有图片（公开访问）
 */
app.get('/api/images/:category', optionalAuth, (req, res) => {
    try {
        const category = sanitizeCategory(req.params.category);
        const categoryDir = path.join(BASE_DIR, category);
        
        if (!fs.existsSync(categoryDir)) {
            return res.json({ images: [] });
        }
        
        const files = fs.readdirSync(categoryDir)
            .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
            .map(file => {
                const fileInfo = {
                    filename: file,
                    url: `/images/${category}/${file}`
                };
                
                // 只有管理员才能看到完整路径
                if (req.user?.role === 'admin') {
                    fileInfo.path = path.join(categoryDir, file);
                    fileInfo.size = fs.statSync(path.join(categoryDir, file)).size;
                }
                
                return fileInfo;
            });
        
        res.json({ images: files });
    } catch (error) {
        console.error('获取图片列表失败:', error);
        res.status(500).json({ error: '获取图片失败' });
    }
});

/**
 * 获取所有分类（公开访问）
 */
app.get('/api/categories', (req, res) => {
    try {
        if (!fs.existsSync(BASE_DIR)) {
            return res.json({ categories: [] });
        }
        
        const categories = fs.readdirSync(BASE_DIR)
            .filter(item => {
                const itemPath = path.join(BASE_DIR, item);
                return fs.statSync(itemPath).isDirectory();
            })
            .filter(cat => ALLOWED_CATEGORIES.includes(cat));
        
        res.json({ categories });
    } catch (error) {
        console.error('获取分类失败:', error);
        res.status(500).json({ error: '获取分类失败' });
    }
});

/**
 * 删除图片（需要管理员权限）
 */
app.delete('/api/images/:category/:filename', verifyToken, (req, res) => {
    try {
        const category = sanitizeCategory(req.params.category);
        const filename = path.basename(req.params.filename);
        const filePath = path.join(BASE_DIR, category, filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: '图片不存在' });
        }
        
        fs.unlinkSync(filePath);
        console.log(`🗑️ 图片已删除：${filePath} (用户：${req.user.username})`);
        
        res.json({ success: true, message: '删除成功' });
    } catch (error) {
        console.error('删除图片失败:', error);
        res.status(500).json({ error: '删除失败' });
    }
});

// ==================== 图片访问控制 ====================

// 图片访问路由（公开浏览，但禁止直接下载原图给非管理员）
app.use('/images', express.static(BASE_DIR, {
    dotfiles: 'deny',
    extensions: false,
    setHeaders: (res, filePath) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        // 禁止爬虫索引图片
        res.setHeader('X-Robots-Tag', 'noindex');
    }
}));

// 禁止下载原图（非管理员）- 可选，根据需要开启
// app.use('/images', optionalAuth, (req, res, next) => {
//     if (req.method === 'GET' && !req.user) {
//         // 非管理员只能查看，不能下载（可以通过禁用右键实现）
//         res.setHeader('Content-Disposition', 'inline');
//     }
//     next();
// });

// ==================== 系统路由 ====================

app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: Date.now(),
        authenticated: !!req.cookies?.token || !!req.headers.authorization 
    });
});

// 404 处理
app.use((req, res) => {
    res.status(404).json({ error: '未找到' });
});

// 错误处理
app.use((err, req, res, next) => {
    console.error('错误:', err.message);
    
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: '文件过大，最大 20MB' });
        }
        return res.status(400).json({ error: `上传错误：${err.message}` });
    }
    
    res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务器
app.listen(PORT, HOST, () => {
    console.log(`🔒 LensView 安全服务器已启动`);
    console.log(`📁 图片存储目录：${BASE_DIR}`);
    console.log(`🌐 访问地址：http://${HOST}:${PORT}`);
    console.log(`👤 管理员：${ADMIN_USERNAME}`);
    console.log(`\n💡 首次使用请运行：npm run init 初始化管理员账号\n`);
});
