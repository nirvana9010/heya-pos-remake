import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  external: [
    'react', 
    'react-dom', 
    /^@radix-ui\//, 
    'class-variance-authority', 
    'clsx', 
    'tailwind-merge',
    'cmdk',
    'date-fns',
    'lucide-react',
    'react-day-picker',
    'tailwindcss-animate',
    '@tanstack/react-table'
  ],
  esbuildOptions(options) {
    options.platform = 'browser';
    options.jsx = 'automatic';
  },
});