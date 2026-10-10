import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const server = spawn(
  process.execPath,
  [
    resolve('node_modules/vite/bin/vite.js'),
    '--host',
    '127.0.0.1',
    '--port',
    '5175',
    '--strictPort',
  ],
  { stdio: 'inherit', windowsHide: true, env: { ...process.env, VITE_SC_A2_PILOT: '1' } },
);
server.on('exit', (code) => {
  process.exitCode = code ?? 0;
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill());
