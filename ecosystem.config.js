module.exports = {
  apps: [
    {
      name: 'posl-api',
      script: 'simple_final_api.js',
      cwd: '/home/ubuntu/POSL-repo',
      env_file: '.env',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    }
  ]
};
