const jwt = require('jsonwebtoken');

/**
 * 验证 JWT Token 中间件
 * 用于保护需要管理员权限的接口
 */
function verifyToken(req, res, next) {
    // 从 Header 或 Cookie 获取 token
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : req.cookies?.token;
    
    if (!token) {
        return res.status(401).json({ 
            error: '未授权',
            message: '请先登录' 
        });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Token 已过期',
                message: '请重新登录' 
            });
        }
        return res.status(403).json({ 
            error: 'Token 无效',
            message: '认证失败' 
        });
    }
}

/**
 * 可选的认证中间件
 * 用于区分已登录和未登录用户
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : req.cookies?.token;
    
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
        } catch (error) {
            // Token 无效但继续，视为未登录
            req.user = null;
        }
    } else {
        req.user = null;
    }
    
    next();
}

module.exports = {
    verifyToken,
    optionalAuth
};
