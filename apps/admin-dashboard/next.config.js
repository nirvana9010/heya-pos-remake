/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['@heya-pos/ui', '@heya-pos/utils', '@heya-pos/types'],
}

module.exports = nextConfig