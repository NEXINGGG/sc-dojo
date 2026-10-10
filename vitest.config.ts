import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { scA1CandidatePlugin } from './scripts/sc-a1-candidate-plugin';

export default defineConfig({
  plugins: [scA1CandidatePlugin(), react()],
  resolve: {
    alias: {
      'virtual:pwa-register/react': fileURLToPath(
        new URL('./src/test/pwaRegisterMock.ts', import.meta.url),
      ),
    },
  },
  test: {
    // Keep the existing NW regression fixtures explicit after SC becomes production.
    // SC release tests clear this flag and separately exercise both approval states.
    env: { VITE_SC_B_LEGACY: '1' },
    environment: 'jsdom',
    exclude: ['e2e/**', 'node_modules/**', 'dist/**', 'tmp/**'],
    setupFiles: './src/test/setup.ts',
    css: true,
    // IndexedDB and lazy route tests share browser-like globals; run files serially for repeatability.
    fileParallelism: false,
  },
});
