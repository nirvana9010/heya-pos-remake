/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@heya-pos/ui', '@heya-pos/utils', '@heya-pos/types', '@heya-pos/shared'],
  
  // Disable type checking during build for deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Enable experimental optimizations
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@heya-pos/ui'],
  },
  
  // Webpack optimization
  webpack: (config, { isServer }) => {
    // Split chunks more aggressively
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor splitting
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },
          // Common components
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
          // UI library
          ui: {
            name: 'ui',
            test: /[\\/]packages[\\/]ui[\\/]/,
            chunks: 'all',
            priority: 30,
          },
        },
      };
    }
    return config;
  },
}

module.exports = nextConfig