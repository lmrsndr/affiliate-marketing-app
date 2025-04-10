import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    target: 'es2020', // Change this from 'esnext' to 'es2020'
    polyfillDynamicImport: true, // ✅ Ensures dynamic imports work in older browsers
    rollupOptions: {
      output: {
        format: 'es' // ✅ Ensures proper ES module format
      }
    }
  }
});
