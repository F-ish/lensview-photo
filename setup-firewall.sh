#!/bin/bash
# LensView 防火墙配置脚本

echo "🔐 LensView 防火墙配置"
echo "======================"
echo ""

# 检查是否 root
if [ "$EUID" -ne 0 ]; then 
  echo "❌ 请使用 sudo 运行此脚本"
  exit 1
fi

# 获取用户公网 IP
echo "📡 正在获取你的公网 IP..."
MY_IP=$(curl -s ifconfig.me)

if [ -z "$MY_IP" ]; then
    echo "❌ 无法获取公网 IP，请手动输入："
    read -p "输入你的公网 IP: " MY_IP
fi

echo "✅ 你的公网 IP: $MY_IP"
echo ""

# 询问是否限制 IP
echo "🔐 防火墙配置选项："
echo "1. 只允许我的 IP 访问（推荐，最安全）"
echo "2. 允许所有人访问 80 端口（公开访问）"
echo "3. 不配置防火墙"
echo ""
read -p "请选择 [1-3]: " choice

case $choice in
    1)
        echo ""
        echo "✅ 选择：只允许 IP $MY_IP 访问"
        echo ""
        read -p "确认配置？[y/N]: " confirm
        if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
            echo "❌ 已取消"
            exit 0
        fi
        
        # 安装 firewalld
        echo "📦 安装 firewalld..."
        dnf install firewalld -y
        
        # 启动服务
        echo "🚀 启动 firewalld..."
        systemctl enable firewalld
        systemctl start firewalld
        
        # 清除默认规则
        echo "🔧 配置防火墙规则..."
        firewall-cmd --permanent --remove-service=http --remove-service=https 2>/dev/null
        
        # 只允许特定 IP 访问 80 端口
        firewall-cmd --permanent --add-rich-rule="rule family=\"ipv4\" source address=\"$MY_IP\" port port=\"80\" protocol=\"tcp\" accept"
        
        # 允许 SSH（防止被锁在外面）
        firewall-cmd --permanent --add-service=ssh
        
        # 拒绝其他所有
        firewall-cmd --permanent --set-target=DROP
        
        # 重载配置
        firewall-cmd --reload
        
        echo ""
        echo "✅ 防火墙配置完成！"
        echo ""
        echo "📋 当前规则："
        firewall-cmd --list-all
        echo ""
        echo "🌐 访问地址：http://$MY_IP"
        echo ""
        echo "⚠️  注意：只有你的 IP ($MY_IP) 可以访问网站"
        ;;
        
    2)
        echo ""
        echo "✅ 选择：允许所有人访问"
        echo ""
        read -p "确认配置？[y/N]: " confirm
        if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
            echo "❌ 已取消"
            exit 0
        fi
        
        # 安装 firewalld
        echo "📦 安装 firewalld..."
        dnf install firewalld -y
        
        # 启动服务
        echo "🚀 启动 firewalld..."
        systemctl enable firewalld
        systemctl start firewalld
        
        # 配置规则
        echo "🔧 配置防火墙规则..."
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        firewall-cmd --permanent --add-service=ssh
        
        # 重载配置
        firewall-cmd --reload
        
        echo ""
        echo "✅ 防火墙配置完成！"
        echo ""
        echo "📋 当前规则："
        firewall-cmd --list-all
        echo ""
        echo "🌐 访问地址：http://你的公网IP"
        echo ""
        echo "⚠️  注意：任何人都可以访问你的网站"
        ;;
        
    3)
        echo "❌ 不配置防火墙"
        exit 0
        ;;
        
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

echo ""
echo "💡 管理命令："
echo "  查看状态：sudo firewall-cmd --state"
echo "  查看规则：sudo firewall-cmd --list-all"
echo "  添加 IP:   sudo firewall-cmd --permanent --add-rich-rule='rule family=\"ipv4\" source address=\"IP 地址\" port port=\"80\" protocol=\"tcp\" accept'"
echo "  重载配置：sudo firewall-cmd --reload"
echo ""
