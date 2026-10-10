import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';
import { createPwaManifest, normalizeAppBase } from './src/features/pwa/manifest';
import { APP_ID } from './src/app/appIdentity';
import { scA1CandidatePlugin } from './scripts/sc-a1-candidate-plugin';
import { scBPilotAssetsPlugin } from './scripts/sc-b-pilot-assets-plugin';
import {
  maximumQuestionImageBytes,
  pwaPrecacheGlobPatterns,
  questionImageGlob,
} from './src/features/pwa/questionAssets.mjs';

const appBase = normalizeAppBase(process.env.VITE_APP_BASE);
const scBAssetsEnabled =
  JSON.parse(readFileSync(new URL('./data/sc-b-v1-release-gate.json', import.meta.url), 'utf8'))
    .approved === true || process.env.VITE_SC_B_RELEASE_CANDIDATE === '1';

export default defineConfig({
  base: appBase,
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          dexie: ['dexie'],
          learning: [fileURLToPath(new URL('./src/data/catalog.ts', import.meta.url))],
          scBMaterial: [
            fileURLToPath(new URL('./data/sc-b-cases-2023-2025-ready.json', import.meta.url)),
          ],
          scBPilotMaterial: [
            fileURLToPath(new URL('./data/sc-b-pilot-2025-fall.json', import.meta.url)),
          ],
        },
      },
    },
  },
  plugins: [
    scBPilotAssetsPlugin(),
    scA1CandidatePlugin(),
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: [
        'favicon.svg',
        'icons/a1-dojo-icon.svg',
        'icons/a1-dojo-apple-touch-icon.png',
        questionImageGlob,
      ],
      manifest: createPwaManifest(appBase),
      workbox: {
        cacheId: APP_ID,
        // Workbox's global cleanup can also delete NW caches on the same origin.
        // Normal precache activation still removes obsolete entries from the SC cache.
        cleanupOutdatedCaches: false,
        navigateFallback: 'index.html',
        globPatterns: pwaPrecacheGlobPatterns,
        maximumFileSizeToCacheInBytes: maximumQuestionImageBytes,
        // Unreleased candidates must not add 100 MB to the active NW installation.
        manifestTransforms: [
          async (manifest) => ({
            manifest: scBAssetsEnabled
              ? manifest
              : manifest.filter((entry) => !entry.url.startsWith('questions/sc/b/')),
            warnings: [],
          }),
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
