import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  external: ['date-fns', 'date-fns-tz'],
  esbuildOptions(options) {
    options.platform = 'node';
  },
});