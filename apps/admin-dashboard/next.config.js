/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['@heya-pos/ui', '@heya-pos/utils', '@heya-pos/types', '@heya-pos/shared'],
}

module.exports = nextConfig