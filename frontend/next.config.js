/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    typedRoutes: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  // 開発時のESLintエラーでビルドを止めない
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'development',
  },
  // TypeScriptエラーでビルドを止めない（開発時）
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
};

module.exports = nextConfig;