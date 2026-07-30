import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/content': path.resolve(__dirname, './content'),
      '@/public': path.resolve(__dirname, './public'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
  },
});
