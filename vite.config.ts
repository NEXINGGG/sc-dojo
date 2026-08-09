import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
import { createPwaManifest, normalizeAppBase } from './src/features/pwa/manifest';

const appBase = normalizeAppBase(process.env.VITE_APP_BASE);

export default defineConfig({
  base: appBase,
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          dexie: ['dexie'],
          learning: [fileURLToPath(new URL('./src/data/catalog.ts', import.meta.url))],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: [
        'favicon.svg',
        'icons/a1-dojo-icon.svg',
        'icons/a1-dojo-apple-touch-icon.png',
      ],
      manifest: createPwaManifest(appBase),
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{html,js,css,png,svg,webmanifest}'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
