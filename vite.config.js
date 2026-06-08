import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path';
import pkg from './package.json';

// https://vite.dev/config/
export default defineConfig({
  base: '/KidsAccount/', 
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
