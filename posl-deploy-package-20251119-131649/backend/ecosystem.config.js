module.exports = {
  apps: [{
    name: 'posl-api',
    script: '../simple_final_api.js',  // ルートディレクトリのファイルを指定
    cwd: '/home/ubuntu/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    log_file: '/home/ubuntu/backend/combined.log',
    out_file: '/home/ubuntu/backend/out.log',
    error_file: '/home/ubuntu/backend/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // 環境変数ファイルの読み込み
    env_file: '/home/ubuntu/.env'
  }]
};