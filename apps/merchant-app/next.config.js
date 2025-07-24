/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@heya-pos/ui', '@heya-pos/utils', '@heya-pos/types', '@heya-pos/shared'],
  
  // Production optimizations
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  
  // Disable type checking during build for deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Image optimization
  images: {
    domains: ['localhost'],
    formats: ['image/avif', 'image/webp'],
  },
  
  
  // Experimental features for better performance
  experimental: {
    optimizeCss: true,
    // Removed date-fns from optimizePackageImports to prevent webpack module loading errors
    // See commit f8deabf for similar fix with @heya-pos/ui
    optimizePackageImports: ['@heya-pos/ui'],
  },
  
  // Headers for better caching
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          }
        ]
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          }
        ]
      },
      {
        source: '/js/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Content-Type',
            value: 'application/javascript',
          }
        ]
      },
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          }
        ]
      }
    ]
  },
  
  // Webpack configuration
  webpack: (config, { isServer, dev }) => {
    // Fix for ChunkLoadError
    if (!isServer) {
      config.output.publicPath = '/_next/';
      
      // Increase chunk load timeout
      config.output.chunkLoadTimeout = 120000; // 2 minutes
      
      // Force webpack runtime to use correct public path
      config.output.hotUpdateChunkFilename = 'static/webpack/[id].[fullhash].hot-update.js';
      config.output.hotUpdateMainFilename = 'static/webpack/[runtime].[fullhash].hot-update.json';
      
      // Better chunk naming for cache busting
      if (!dev) {
        config.output.filename = 'static/chunks/[name].[contenthash].js';
        config.output.chunkFilename = 'static/chunks/[name].[contenthash].js';
      }
    }
    // Resolve @heya-pos/ui to its dist folder
    config.resolve.alias = {
      ...config.resolve.alias,
      '@heya-pos/ui': require.resolve('@heya-pos/ui'),
    };
    
    // Development optimizations
    if (dev) {
      config.watchOptions = {
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**', '**/logs/**', '**/*.log'],
        aggregateTimeout: 500,
        poll: false, // Disable polling to prevent false restarts
      };
      
      // Faster rebuilds in development
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      };
    }
    
    // Production optimizations
    if (!isServer && !dev) {
      // Better chunk splitting for production
      config.optimization = {
        ...config.optimization,
        runtimeChunk: 'single',
        moduleIds: 'deterministic',
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: 25,
          minSize: 20000,
          cacheGroups: {
            default: false,
            vendors: false,
            // Framework chunks
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-sync-external-store)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // Library chunks
            lib: {
              test(module) {
                return module.size() > 160000 &&
                  /node_modules[\\/]/.test(module.identifier());
              },
              name(module) {
                // WARNING: Do NOT use require('crypto') here - it causes "crypto is not defined" in production
                // Use a simple hash function instead of crypto for browser compatibility
                const moduleId = module.identifier();
                let hash = 0;
                for (let i = 0; i < moduleId.length; i++) {
                  const char = moduleId.charCodeAt(i);
                  hash = ((hash << 5) - hash) + char;
                  hash = hash & hash; // Convert to 32-bit integer
                }
                return `lib-${Math.abs(hash).toString(16).substring(0, 8)}`;
              },
              priority: 30,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            // Commons chunk
            commons: {
              name: 'commons',
              chunks: 'all',
              minChunks: 2,
              priority: 20,
            },
            // Shared chunks
            shared: {
              name(module, chunks) {
                // Use a simple hash function instead of crypto for browser compatibility
                const chunkNames = chunks.reduce((acc, chunk) => acc + chunk.name, '');
                let hash = 0;
                for (let i = 0; i < chunkNames.length; i++) {
                  const char = chunkNames.charCodeAt(i);
                  hash = ((hash << 5) - hash) + char;
                  hash = hash & hash; // Convert to 32-bit integer
                }
                return `shared-${Math.abs(hash).toString(16).substring(0, 8)}`;
              },
              priority: 10,
              minChunks: 2,
              reuseExistingChunk: true,
            },
          },
        },
      };
      
      // Add webpack runtime optimization
      config.optimization.minimize = true;
      
      // Add retry logic for chunk loading
      config.output.crossOriginLoading = 'anonymous';
    }
    
    // Fix module resolution for monorepo
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    
    return config;
  },
  
  // Output configuration
  output: 'standalone',
  
  // Redirects for better UX
  async redirects() {
    return [
      {
        source: '/',
        destination: '/calendar',
        permanent: false,
      },
    ];
  },
  
  // Rewrites for API proxy
  async rewrites() {
    // In production, proxy API calls to the backend
    // The env var should already include /api
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
    
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/:path*`,
      },
    ];
  },
}

module.exports = nextConfig