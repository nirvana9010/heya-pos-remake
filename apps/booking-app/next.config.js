/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@heya-pos/ui', '@heya-pos/utils', '@heya-pos/types'],
  
  // Disable type checking during build for deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Optimize chunk splitting
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Framework chunk
          framework: {
            name: 'framework',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
            priority: 40,
            enforce: true,
          },
          // UI package chunk
          ui: {
            name: 'ui',
            test: /[\\/]packages[\\/]ui[\\/]/,
            chunks: 'all',
            priority: 30,
          },
          // Commons chunk
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
          },
        },
      }
    }
    return config
  },
}

module.exports = nextConfig