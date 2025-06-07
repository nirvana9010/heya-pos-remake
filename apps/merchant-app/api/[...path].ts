import { createProxyMiddleware } from 'http-proxy-middleware';

export default createProxyMiddleware({
  target: process.env.API_URL || 'http://localhost:3000',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api',
  },
});

export const config = {
  api: {
    bodyParser: false,
  },
};