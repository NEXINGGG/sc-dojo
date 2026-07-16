import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const nodeModules = join(rootDir, 'node_modules');
const commands = [
  ['data validation', process.execPath, ['scripts/validate-data.mjs']],
  ['lint', process.execPath, [join(nodeModules, 'eslint', 'bin', 'eslint.js'), '.']],
  [
    'type check',
    process.execPath,
    [join(nodeModules, 'typescript', 'bin', 'tsc'), '-b', '--pretty', 'false'],
  ],
  ['tests', process.execPath, [join(nodeModules, 'vitest', 'vitest.mjs'), 'run']],
  ['build', process.execPath, [join(nodeModules, 'vite', 'bin', 'vite.js'), 'build']],
];

for (const [name, command, args] of commands) {
  console.log(`\n== ${name} ==`);
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    break;
  }
}
