import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-scan': path.resolve(__dirname, '../dist/development.mjs'),
    },
  },
});
