import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 通し操作テストは 127.0.0.1 から開くため、開発時の許可元に加えておく。
  allowedDevOrigins: ['127.0.0.1'],
}

export default nextConfig
