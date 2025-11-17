// 環境変数設定用のスタートアップスクリプト
require('dotenv').config({ path: '../.env' });
console.log('✅ 環境変数読み込み完了');
console.log('🔑 OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'sk-proj-****' + process.env.OPENAI_API_KEY.slice(-10) : 'NOT_SET');

// Serverless Offline起動
const { exec } = require('child_process');
const serverless = exec('npx serverless offline');

serverless.stdout.on('data', (data) => {
  console.log(data.toString());
});

serverless.stderr.on('data', (data) => {
  console.error(data.toString());
});

serverless.on('close', (code) => {
  console.log(`Serverless process exited with code ${code}`);
});