import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['./src/index.ts', './src/auto.ts'],
  outDir: './dist',
  splitting: false,
  sourcemap: false,
  format: ['cjs', 'esm', 'iife'],
  target: 'es6',
  platform: 'browser',
  treeshake: true,
  dts: true,
  minify: 'terser',
  env: {
    NODE_ENV: process.env.NODE_ENV ?? 'development',
  },
  external: ['react', 'react-dom', 'react-reconciler'],
});
