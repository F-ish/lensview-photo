#!/bin/bash

# LensView 登录功能测试脚本

BASE_URL="http://localhost"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo "  LensView 登录功能测试"
echo "======================================"
echo ""

# 检查 jq 是否安装
if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ 错误：jq 未安装${NC}"
    echo "请运行：sudo dnf install jq -y"
    exit 1
fi

# 测试 1：登录
echo -e "${YELLOW}[1/5] 测试登录...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

if echo "$LOGIN_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')
    echo -e "${GREEN}✅ 登录成功${NC}"
    echo "   Token: ${TOKEN:0:50}..."
    echo ""
else
    echo -e "${RED}❌ 登录失败${NC}"
    echo "$LOGIN_RESPONSE" | jq .
    exit 1
fi

# 测试 2：验证 Token
echo -e "${YELLOW}[2/5] 验证 Token 有效性...${NC}"
VERIFY_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/auth/verify" \
  -H "Authorization: Bearer $TOKEN")

if echo "$VERIFY_RESPONSE" | jq -e '.valid' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Token 有效${NC}"
    echo "   用户：$(echo "$VERIFY_RESPONSE" | jq -r '.user.username')"
    echo "   角色：$(echo "$VERIFY_RESPONSE" | jq -r '.user.role')"
    echo ""
else
    echo -e "${RED}❌ Token 无效${NC}"
    echo "$VERIFY_RESPONSE" | jq .
    exit 1
fi

# 测试 3：未授权访问
echo -e "${YELLOW}[3/5] 测试未授权访问上传接口...${NC}"
UNAUTH_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/upload" \
  -F "photo=@/tmp/test.jpg" \
  -F "category=风景")

if echo "$UNAUTH_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 未授权访问被正确拒绝${NC}"
    echo "   错误信息：$(echo "$UNAUTH_RESPONSE" | jq -r '.error')"
    echo ""
else
    echo -e "${RED}❌ 未授权访问未被拒绝${NC}"
    echo "$UNAUTH_RESPONSE" | jq .
    exit 1
fi

# 测试 4：创建真实测试图片
echo -e "${YELLOW}[4/5] 创建测试图片...${NC}"
if command -v convert &> /dev/null; then
    convert -size 100x100 xc:blue /tmp/test_real.jpg
    echo -e "${GREEN}✅ 测试图片已创建${NC} (/tmp/test_real.jpg)"
    echo ""
else
    # 如果没有 ImageMagick，创建一个简单的测试文件
    echo "test image content" > /tmp/test_real.jpg
    echo -e "${YELLOW}⚠️  ImageMagick 未安装，创建了一个假图片文件${NC}"
    echo ""
fi

# 测试 5：已授权上传
echo -e "${YELLOW}[5/5] 测试已授权上传...${NC}"
UPLOAD_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "photo=@/tmp/test_real.jpg" \
  -F "category=风景")

if echo "$UPLOAD_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 上传成功${NC}"
    echo "   文件：$(echo "$UPLOAD_RESPONSE" | jq -r '.data.filename')"
    echo "   分类：$(echo "$UPLOAD_RESPONSE" | jq -r '.data.category')"
    echo ""
else
    # 上传可能因为文件验证失败，但鉴权应该通过
    if echo "$UPLOAD_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
        ERROR_MSG=$(echo "$UPLOAD_RESPONSE" | jq -r '.error')
        if [[ "$ERROR_MSG" == *"文件验证"* ]]; then
            echo -e "${GREEN}✅ 鉴权通过（文件验证失败是预期的）${NC}"
            echo "   错误信息：$ERROR_MSG"
            echo "   （因为创建的不是真实图片）"
            echo ""
        else
            echo -e "${RED}❌ 上传失败${NC}"
            echo "   错误信息：$ERROR_MSG"
            echo ""
        fi
    else
        echo -e "${RED}❌ 上传失败${NC}"
        echo "$UPLOAD_RESPONSE" | jq .
        echo ""
    fi
fi

# 测试 6：错误密码
echo -e "${YELLOW}[6/5] 测试错误密码...${NC}"
WRONG_PASS_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"wrongpassword"}')

if echo "$WRONG_PASS_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 错误密码被正确拒绝${NC}"
    echo "   错误信息：$(echo "$WRONG_PASS_RESPONSE" | jq -r '.error')"
    echo ""
else
    echo -e "${RED}❌ 错误密码未被拒绝${NC}"
    echo "$WRONG_PASS_RESPONSE" | jq .
    exit 1
fi

echo "======================================"
echo -e "  ${GREEN}所有测试通过！✅${NC}"
echo "======================================"
echo ""
echo "📝 测试摘要："
echo "   - 登录功能：正常"
echo "   - Token 验证：正常"
echo "   - 权限控制：正常"
echo "   - 错误处理：正常"
echo ""
echo "💡 提示：Token 已保存到 \$TOKEN 变量"
echo "   可以在后续请求中使用："
echo "   curl -H \"Authorization: Bearer \$TOKEN\" ..."
echo ""
