import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
const child = spawn(process.execPath, [resolve('node_modules/vite/bin/vite.js')], {
  stdio: 'inherit',
  windowsHide: true,
  env: { ...process.env, VITE_SC_B_PILOT: '', VITE_SC_B_RELEASE_CANDIDATE: '1' },
});
child.once('exit', (code) => {
  process.exitCode = code ?? 1;
});
