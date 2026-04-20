const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cors = require('cors');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const app = express();
const PORT = 3000;

// 安全中间件
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost'],
    credentials: false
}));
app.use(express.json({ limit: '1mb' })); // 限制 JSON 大小
app.use(express.static(__dirname, { 
    dotfiles: 'deny',
    extensions: ['html']
}));

// 安全配置
const BASE_DIR = path.join(__dirname, 'photos');
const ALLOWED_CATEGORIES = ['人像', '风景', '城市', '自然', '动物', '建筑', '美食', 'uncategorized'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

// 确保基础目录存在并设置权限
if (!fs.existsSync(BASE_DIR)) {
    fs.mkdirSync(BASE_DIR, { recursive: true, mode: 0o750 });
    console.log(`📁 创建照片存储目录：${BASE_DIR}`);
}

// 验证文件是否为真实图片（使用 file 命令）
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

// 清理文件名，防止路径穿越
function sanitizeCategory(category) {
    if (!category) return 'uncategorized';
    // 只允许安全字符
    const sanitized = category.replace(/[^\w\u4e00-\u9fa5-]/g, '');
    return ALLOWED_CATEGORIES.includes(sanitized) ? sanitized : 'uncategorized';
}

// 生成安全的随机文件名
function generateSecureFilename(ext) {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(16).toString('hex');
    return `img_${timestamp}_${randomBytes}${ext}`;
}

// 文件过滤 - 多层验证
const fileFilter = (req, file, cb) => {
    // 1. 检查扩展名
    const allowedExts = ['.jpeg', '.jpg', '.png', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExts.includes(ext)) {
        return cb(new Error('只允许 JPG, PNG, GIF 格式'), false);
    }
    
    // 2. 检查 MIME 类型
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(new Error('文件类型不允许'), false);
    }
    
    cb(null, true);
};

// 配置 multer 存储
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const category = sanitizeCategory(req.body.category);
        const categoryDir = path.join(BASE_DIR, category);
        
        if (!fs.existsSync(categoryDir)) {
            fs.mkdirSync(categoryDir, { recursive: true, mode: 0o750 });
        }
        
        cb(null, categoryDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        const secureFilename = generateSecureFilename(ext);
        cb(null, secureFilename);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1
    },
    fileFilter: fileFilter
});

// 错误处理中间件
const errorHandler = (err, req, res, next) => {
    console.error('错误:', err.message);
    
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: '文件过大，最大 20MB' });
        }
        return res.status(400).json({ error: `上传错误：${err.message}` });
    }
    
    res.status(500).json({ error: '服务器内部错误' });
};

// 上传路由 - 增强安全
app.post('/api/upload', upload.single('photo'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '没有上传文件' });
        }
        
        // 3. 二次验证文件真实性（防止 MIME 伪造）
        const isRealImage = await verifyImageFile(req.file.path);
        if (!isRealImage) {
            // 删除上传的假图片
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: '文件验证失败，不是有效的图片' });
        }
        
        // 设置安全的文件权限
        fs.chmodSync(req.file.path, 0o640);
        
        const category = sanitizeCategory(req.body.category);
        const imageUrl = `/images/${category}/${path.basename(req.file.path)}`;
        
        console.log(`✅ 图片上传成功：${req.file.path}`);
        
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

// 获取某分类下的所有图片
app.get('/api/images/:category', (req, res) => {
    try {
        const category = sanitizeCategory(req.params.category);
        const categoryDir = path.join(BASE_DIR, category);
        
        if (!fs.existsSync(categoryDir)) {
            return res.json({ images: [] });
        }
        
        const files = fs.readdirSync(categoryDir)
            .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
            .map(file => ({
                filename: file,
                url: `/images/${category}/${file}`
            }));
        
        res.json({ images: files });
    } catch (error) {
        console.error('获取图片列表失败:', error);
        res.status(500).json({ error: '获取图片失败' });
    }
});

// 获取所有分类
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
            .filter(cat => ALLOWED_CATEGORIES.includes(cat)); // 只返回允许的分类
        
        res.json({ categories });
    } catch (error) {
        console.error('获取分类失败:', error);
        res.status(500).json({ error: '获取分类失败' });
    }
});

// 图片访问路由
app.use('/images', express.static(BASE_DIR, {
    dotfiles: 'deny',
    extensions: false
}));

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// 404 处理
app.use((req, res) => {
    res.status(404).json({ error: '未找到' });
});

// 错误处理
app.use(errorHandler);

// 启动服务器
app.listen(PORT, '127.0.0.1', () => {
    console.log(`🚀 LensView 安全服务器已启动`);
    console.log(`📁 图片存储目录：${BASE_DIR}`);
    console.log(`🔒 仅监听本地：127.0.0.1:${PORT}`);
    console.log(`🌐 通过 Nginx 访问：http://localhost`);
});
