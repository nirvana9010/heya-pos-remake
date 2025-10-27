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
      // Provide fallback for Node.js modules in the browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false, // Disable crypto module in browser
        stream: false,
        buffer: false,
      };
      
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
  async rewrites() {
    const apiBase =
      (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '')
    return [
      {
        source: '/api/:version(v[0-9]+)/:path*',
        destination: `${apiBase}/:version/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
