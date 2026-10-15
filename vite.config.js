import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    injectRegister: 'script',
    includeAssets: ['icons/*.png', 'fonts/noto-sans-myanmar-OFL.txt'],
    manifest: {
      id: '/',
      name: 'Assembly: Endgame',
      short_name: 'Endgame',
      description: 'English words, Myanmar slang and Myanmar proverb games.',
      lang: 'my',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      theme_color: '#090f18',
      background_color: '#090f18',
      categories: ['games', 'education'],
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,woff2,ttf}'],
      globIgnores: ['**/preview.png', '**/og-game-preview.png'],
      navigateFallback: '/index.html',
      cleanupOutdatedCaches: true,
    },
  })],
})
