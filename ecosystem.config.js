module.exports = {
  apps: [
    {
      name: 'api',
      script: './scripts/start-api-with-env.sh',
      watch: false,  // Let Next.js/NestJS handle hot reload
      env: { 
        PORT: 3000,
        NODE_ENV: 'development'
      }
    },
    {
      name: 'merchant',
      script: 'npm',
      args: 'run dev:direct',
      cwd: './apps/merchant-app',
      watch: false,
      env: { 
        PORT: 3002,
        NODE_ENV: 'development'
      }
    },
    {
      name: 'booking',
      script: 'npm',
      args: 'run dev',
      cwd: './apps/booking-app',
      watch: false,
      env: { 
        PORT: 3001,
        NODE_ENV: 'development'
      }
    },
    {
      name: 'admin',
      script: 'npm',
      args: 'run dev',
      cwd: './apps/admin-dashboard',
      watch: false,
      env: { 
        PORT: 3003,
        NODE_ENV: 'development'
      }
    }
  ]
};