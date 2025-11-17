#!/bin/bash
set -e

# ログの設定
exec > >(tee /var/log/user-data.log) 2>&1
echo "Starting user data script for ${project_name}-${environment}"

# システム更新
apt-get update -y
apt-get upgrade -y

# 必要パッケージのインストール
apt-get install -y \
    curl \
    wget \
    unzip \
    git \
    htop \
    vim \
    mysql-client \
    awscli

# Node.js 18.x のインストール
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# PM2のグローバルインストール
npm install -g pm2

# プロジェクトディレクトリの作成
mkdir -p /opt/${project_name}
chown ubuntu:ubuntu /opt/${project_name}

# CloudWatchエージェントのインストール
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i -E ./amazon-cloudwatch-agent.deb

# CloudWatchエージェント設定ファイル作成
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << EOL
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "cwagent"
  },
  "metrics": {
    "namespace": "${project_name}/EC2",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          "cpu_usage_idle",
          "cpu_usage_iowait",
          "cpu_usage_user",
          "cpu_usage_system"
        ],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": [
          "used_percent"
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "*"
        ]
      },
      "mem": {
        "measurement": [
          "mem_used_percent"
        ],
        "metrics_collection_interval": 60
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/opt/${project_name}/logs/*.log",
            "log_group_name": "/aws/ec2/${project_name}",
            "log_stream_name": "{instance_id}"
          },
          {
            "file_path": "/var/log/user-data.log",
            "log_group_name": "/aws/ec2/${project_name}",
            "log_stream_name": "{instance_id}/user-data"
          }
        ]
      }
    }
  }
}
EOL

# CloudWatchエージェント開始
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

# Nginxのインストールと設定
apt-get install -y nginx

# Nginx設定（リバースプロキシ）
cat > /etc/nginx/sites-available/${project_name} << EOL
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOL

# Nginxサイト有効化
ln -sf /etc/nginx/sites-available/${project_name} /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
systemctl enable nginx

# ログディレクトリの作成
mkdir -p /opt/${project_name}/logs
chown ubuntu:ubuntu /opt/${project_name}/logs

# systemdサービスファイル作成
cat > /etc/systemd/system/${project_name}.service << EOL
[Unit]
Description=${project_name} Application
After=network.target

[Service]
Type=forking
User=ubuntu
WorkingDirectory=/opt/${project_name}
ExecStart=/usr/bin/pm2 start ecosystem.config.js --env ${environment}
ExecReload=/usr/bin/pm2 reload all
ExecStop=/usr/bin/pm2 stop all
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOL

systemctl daemon-reload
systemctl enable ${project_name}.service

echo "User data script completed successfully"