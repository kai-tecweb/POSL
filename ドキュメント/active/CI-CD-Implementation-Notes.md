# テスト設定の拡張

## 統合テスト設定

POSLプロジェクトの統合テストには以下の項目を追加で実装する必要があります：

### 1. バックエンド統合テスト

```bash
# backend/package.jsonに追加
"scripts": {
  "test:integration": "jest --config jest.integration.config.js",
  "test:performance": "jest --config jest.performance.config.js",
  "test:e2e": "jest --config jest.e2e.config.js"
}
```

### 2. フロントエンド E2E テスト

```bash
# frontend/package.jsonに追加  
"scripts": {
  "test:e2e": "playwright test"
}
```

### 3. 必要な依存関係

```bash
# バックエンドテスト拡張
npm install --save-dev supertest @types/supertest

# E2Eテスト
npm install --save-dev @playwright/test

# パフォーマンステスト
npm install --save-dev clinic autocannon
```

## 設定ファイルテンプレート

### jest.integration.config.js
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.integration.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/integration-setup.ts'],
  testTimeout: 30000,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts'
  ]
}
```

### playwright.config.ts
```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 2,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
})
```

## GitHub Actions Secrets設定

以下のSecretsをGitHubリポジトリに設定する必要があります：

### 必須設定
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `OPENAI_API_KEY`
- `TWITTER_API_KEY`
- `TWITTER_API_SECRET`
- `TWITTER_ACCESS_TOKEN`
- `TWITTER_ACCESS_TOKEN_SECRET`

### 環境別設定
- `PROD_API_URL`
- `DEV_API_URL`
- `PROD_S3_BUCKET`
- `DEV_S3_BUCKET`

### 通知設定
- `SLACK_WEBHOOK_URL`
- `SNYK_TOKEN` (optional)
- `SONAR_TOKEN` (optional)

## 次のステップ

1. **統合テストの実装**
2. **E2Eテストの作成**  
3. **GitHub Secrets の設定**
4. **パイプラインの段階的有効化**