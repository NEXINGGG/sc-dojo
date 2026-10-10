import { createServer } from 'vite';

process.env.VITE_SC_A2_PILOT = '1';
const server = await createServer({ server: { host: '127.0.0.1', port: 5175, strictPort: true } });
await server.listen();
console.log(`READY ${server.resolvedUrls.local[0]}`);
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, async () => {
    await server.close();
    process.exit(0);
  });
