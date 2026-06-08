import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path';
import pkg from './package.json';
import { VitePWA } from 'vite-plugin-pwa'; 

export default defineConfig({
  base: '/KidsAccount/', 
   plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        runtimeCaching: [
          {
            // Cache your Google Apps Script API calls
            urlPattern: /^https:\/\/script\.google\.com\/macros\/s\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          },
          {
            // Cache images/avatars
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'avatar-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      },
      manifest: {
        name: 'KidsAccount',
        short_name: 'KidsAccount',
        theme_color: '#38bdf8',
        icons: [
          // Add your icon paths here
        ]
      }
    })
  ],
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
