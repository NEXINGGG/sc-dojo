import { build, preview } from 'vite';
import { localTestPort } from './local-test-port.mjs';
process.env.VITE_SC_B_PILOT = '';
process.env.VITE_SC_B_RELEASE_CANDIDATE = '1';
await build({ build: { outDir: 'tmp/sc-b-v1/dist', emptyOutDir: true } });
const server = await preview({
  build: { outDir: 'tmp/sc-b-v1/dist' },
  preview: { host: 'localhost', port: await localTestPort(), strictPort: true },
});
console.log(`READY ${server.resolvedUrls.local[0]}`);
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () => {
    server.httpServer.close(() => process.exit(0));
  });
