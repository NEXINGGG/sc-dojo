import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const host = '127.0.0.1';
const port = '4174';
const previewUrl = `http://${host}:${port}/`;

try {
  await access(resolve('dist/index.html'));
} catch {
  throw new Error('E2Eの前に pnpm run build を実行してください。');
}

const preview = spawn(
  process.execPath,
  [resolve('node_modules/vite/bin/vite.js'), 'preview', '--host', host, '--port', port],
  { stdio: 'ignore', windowsHide: true },
);

try {
  await waitForPreview();
  const exitCode = await runPlaywright();
  process.exitCode = exitCode;
} finally {
  preview.kill();
}

async function waitForPreview() {
  const timeoutAt = Date.now() + 15_000;
  while (Date.now() < timeoutAt) {
    if (preview.exitCode !== null) {
      throw new Error('E2E用のpreviewサーバーを起動できませんでした。');
    }
    try {
      const response = await fetch(previewUrl);
      if (response.ok) return;
    } catch {
      // 起動直後は接続できないため、短時間だけ再試行します。
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 150));
  }
  throw new Error('E2E用のpreviewサーバーの起動がタイムアウトしました。');
}

function runPlaywright() {
  const playwright = spawn(
    process.execPath,
    [
      resolve('node_modules/playwright/cli.js'),
      'test',
      '--config',
      resolve('playwright.config.ts'),
    ],
    {
      cwd: tmpdir(),
      stdio: 'inherit',
      windowsHide: true,
      env: {
        ...process.env,
        CHROME_LOG_FILE: resolve(tmpdir(), 'nw-a1-dojo-chromium.log'),
        PLAYWRIGHT_EXTERNAL_PREVIEW: '1',
      },
    },
  );
  return new Promise((resolveExit, rejectExit) => {
    playwright.once('error', rejectExit);
    playwright.once('exit', (code) => resolveExit(code ?? 1));
  });
}
