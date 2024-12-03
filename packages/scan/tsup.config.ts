import fs from 'node:fs/promises';
import path from 'node:path';
import { defineConfig } from 'tsup';

const DIST_PATH = './dist';

const addDirectivesToChunkFiles = async (
  distPath = DIST_PATH,
): Promise<void> => {
  try {
    const files = await fs.readdir(distPath);

    for (const file of files) {
      if (file.endsWith('.mjs') || file.endsWith('.js')) {
        const filePath = path.join(distPath, file);

        const data = await fs.readFile(filePath, 'utf8');

        const updatedContent = `'use client';\n${data}`;

        await fs.writeFile(filePath, updatedContent, 'utf8');

        // eslint-disable-next-line no-console
        console.log(`Directive has been added to ${file}`);
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console -- We need to log the error
    console.error('Error:', err);
  }
};

export default defineConfig([
  {
    entry: ['./src/index.ts', './src/auto.ts', './src/rsc-shim.ts'],
    outDir: DIST_PATH,
    splitting: false,
    sourcemap: false,
    format: ['cjs', 'esm', 'iife'],
    target: 'esnext',
    platform: 'browser',
    treeshake: true,
    dts: true,
    async onSuccess() {
      await addDirectivesToChunkFiles();
    },
    minify: process.env.NODE_ENV === 'production' ? 'terser' : false,
    env: {
      NODE_ENV: process.env.NODE_ENV ?? 'development',
    },
    external: ['react', 'react-dom', 'react-reconciler'],
  },
  {
    entry: ['./src/cli.mts'],
    outDir: './dist',
    splitting: false,
    sourcemap: false,
    format: ['cjs'],
    target: 'esnext',
    platform: 'node',
    minify: process.env.NODE_ENV === 'production' ? 'terser' : false,
    env: {
      NODE_ENV: process.env.NODE_ENV ?? 'development',
    },
  },
]);
