import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/WordPunk/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'WordPunk',
        short_name: 'WordPunk',
        description: 'Учи английские слова — дерзко и без нытья',
        display: 'standalone',
        background_color: '#0d0d0d',
        theme_color: '#0d0d0d',
        orientation: 'portrait',
        start_url: '/WordPunk/',
        scope: '/WordPunk/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-57.png',  sizes: '57x57',   type: 'image/png' },
          { src: 'icons/icon-60.png',  sizes: '60x60',   type: 'image/png' },
          { src: 'icons/icon-72.png',  sizes: '72x72',   type: 'image/png' },
          { src: 'icons/icon-76.png',  sizes: '76x76',   type: 'image/png' },
          { src: 'icons/icon-114.png', sizes: '114x114', type: 'image/png' },
          { src: 'icons/icon-120.png', sizes: '120x120', type: 'image/png' },
          { src: 'icons/icon-144.png', sizes: '144x144', type: 'image/png' },
          { src: 'icons/icon-152.png', sizes: '152x152', type: 'image/png' },
          { src: 'icons/icon-180.png', sizes: '180x180', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/pub-[a-z0-9]+\.r2\.dev\/.*\.mp3$/i,
            handler: 'CacheFirst',
            options: { cacheName: 'word-audio-cache', expiration: { maxEntries: 10000, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'gstatic-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          }
        ]
      }
    })
  ]
})
