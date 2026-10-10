import { createServer } from 'vite';
import { localTestPort } from './local-test-port.mjs';
process.env.VITE_SC_B_PILOT ??= '1';
const server = await createServer({ server: { host: 'localhost', port: await localTestPort(), strictPort: true } });
await server.listen();
console.log(`READY ${server.resolvedUrls.local[0]}`);
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, async () => {
    await server.close();
    process.exit(0);
  });
