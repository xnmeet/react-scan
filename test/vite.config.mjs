import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import Inspect from 'vite-plugin-inspect';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', {}]],
      },
    }),
    Inspect(),
  ],
  resolve: {
    alias: {
      'react-scan/auto': path.resolve(__dirname, '../dist/auto.mjs'),
      'react-scan': path.resolve(__dirname, '../dist/index.mjs'),
    },
  },
});
