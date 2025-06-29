module.exports = {
  apps: [
    {
      name: 'api',
      script: 'npm',
      args: 'run start:dev',
      cwd: './apps/api',
      watch: false,  // Let Next.js/NestJS handle hot reload
      env: { PORT: 3000 }
    },
    {
      name: 'merchant',
      script: 'npm',
      args: 'run dev',
      cwd: './apps/merchant-app',
      watch: false,
      env: { PORT: 3001 }
    },
    {
      name: 'booking',
      script: 'npm',
      args: 'run dev',
      cwd: './apps/booking-app',
      watch: false,
      env: { PORT: 3002 }
    },
    {
      name: 'admin',
      script: 'npm',
      args: 'run dev',
      cwd: './apps/admin-dashboard',
      watch: false,
      env: { PORT: 3003 }
    }
  ]
};