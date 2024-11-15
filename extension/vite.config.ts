import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        'content': './content.js',
        'inject': './inject.js'
      },
      output: {
        entryFileNames: '[name].js',
        format: 'iife'
      }
    },
    outDir: 'dist',
    emptyOutDir: true
  }
});