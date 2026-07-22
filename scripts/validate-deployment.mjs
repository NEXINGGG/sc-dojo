import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';

const rootDirectory = process.cwd();
const distDirectory = join(rootDirectory, 'dist');
const errors = [];
const expectedBase = normalizeAppBase(process.env.VITE_APP_BASE);

assert(existsSync(distDirectory), 'dist/ がありません。先に pnpm run build を実行してください。');

const distFiles = existsSync(distDirectory) ? listFiles(distDirectory) : [];
const distFileSet = new Set(distFiles);

for (const file of [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  '_headers',
  'robots.txt',
  'icons/a1-dojo-192.png',
  'icons/a1-dojo-512.png',
  'icons/a1-dojo-maskable-512.png',
  'icons/a1-dojo-apple-touch-icon.png',
]) {
  assert(distFileSet.has(file), `dist/${file} が出力されていません。`);
}

assert(
  distFiles.some((file) => /^workbox-[A-Za-z0-9_-]+\.js$/.test(file)),
  'Workboxの成果物がdist直下に出力されていません。',
);
assert(
  distFiles.some((file) => /^assets\/.+-[A-Za-z0-9_-]+\.js$/.test(file)),
  'ハッシュ付きJavaScriptチャンクが出力されていません。',
);

if (existsSync(join(distDirectory, 'manifest.webmanifest'))) {
  const manifest = JSON.parse(readText('manifest.webmanifest'));
  assert(
    manifest.start_url === `${expectedBase}#/`,
    'Manifestのstart_urlが公開パスと一致しません。',
  );
  assert(manifest.scope === expectedBase, 'Manifestのscopeが公開パスと一致しません。');
}

if (existsSync(join(distDirectory, 'index.html'))) {
  const indexHtml = readText('index.html');
  assert(
    /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(indexHtml),
    'dist/index.htmlにnoindexメタタグがありません。',
  );
}

if (existsSync(join(distDirectory, '_headers'))) {
  const headers = readText('_headers');
  for (const header of [
    'X-Content-Type-Options: nosniff',
    'Referrer-Policy: strict-origin-when-cross-origin',
    'X-Frame-Options: DENY',
    'Permissions-Policy:',
    'X-Robots-Tag: noindex',
    '/sw.js',
    'Cache-Control: no-cache, no-store, must-revalidate',
    '/manifest.webmanifest',
    '/assets/*',
    'immutable',
  ]) {
    assert(headers.includes(header), `dist/_headers に必要な設定「${header}」がありません。`);
  }
}

if (existsSync(join(distDirectory, 'robots.txt'))) {
  const robots = readText('robots.txt');
  assert(/User-agent:\s*\*/i.test(robots), 'robots.txtにUser-agentがありません。');
  assert(/Disallow:\s*\//i.test(robots), 'robots.txtが全体のクロールを抑制していません。');
}

const learningChunk = distFiles.find((file) => /^assets\/learning-[A-Za-z0-9_-]+\.js$/.test(file));
assert(learningChunk !== undefined, '問題データを含むlearningチャンクが出力されていません。');
if (learningChunk !== undefined) {
  const learningSource = readText(learningChunk);
  const questions = JSON.parse(
    readFileSync(join(rootDirectory, 'data/questions.json'), 'utf8'),
  ).questions;
  const a2Questions = JSON.parse(
    readFileSync(join(rootDirectory, 'data/a2-questions.json'), 'utf8'),
  ).questions;
  assert(questions.length === 240, 'questions.jsonの問題数が240問ではありません。');
  const missingCodes = [...questions, ...a2Questions]
    .map((question) => question.code)
    .filter((code) => !learningSource.includes(code));
  assert(
    missingCodes.length === 0,
    `問題データがlearningチャンクに含まれていません（${missingCodes.length}問）。`,
  );
  const serviceWorker = readText('sw.js');
  assert(
    serviceWorker.includes(learningChunk),
    'learningチャンクがService Workerのprecache対象ではありません。',
  );
}

const prohibitedArtifacts = distFiles.filter((file) =>
  /(^|\/)(playwright-report|test-results|coverage)(\/|$)|\.(zip|webm)$/i.test(file),
);
assert(prohibitedArtifacts.length === 0, 'dist/にテスト成果物が含まれています。');

const inspectableFiles = distFiles.filter((file) =>
  /\.(?:html|js|css|webmanifest|txt)$/i.test(file),
);
const joinedSource = inspectableFiles.map((file) => readText(file)).join('\n');
assert(
  !distFiles.some((file) => /\.pdf$/i.test(file)),
  'dist/ に公式PDFを含めないでください。利用者が登録したPDFはIndexedDBだけに保存します。',
);
const serviceWorkerSource = existsSync(join(distDirectory, 'sw.js')) ? readText('sw.js') : '';
assert(
  !/\.pdf(?:["'`?]|$)|ipa\.go\.jp/i.test(serviceWorkerSource),
  'Service Workerのprecacheに公式PDFまたはIPAのPDF URLを含めないでください。',
);
assert(
  !/(?:[A-Za-z]:\\|file:\/\/|\/Users\/|\/home\/)/.test(joinedSource),
  'dist/に絶対ローカルパスが含まれています。',
);

const secretPatterns = [
  /AKIA[0-9A-Z]{16}/,
  /gh[pousr]_[A-Za-z0-9_]{20,}/,
  /xox[baprs]-[A-Za-z0-9-]{20,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];
assert(
  !secretPatterns.some((pattern) => pattern.test(joinedSource)),
  'dist/に既知形式の秘密情報らしき値が含まれています。',
);

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`ERROR: ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(`deployment artifacts: ${distFiles.length} files checked`);
  console.log(`PWA base: ${expectedBase}, A-1/A-2とB-1アプリデータをprecache（公式PDFは除外）`);
}

function assert(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

function normalizeAppBase(value) {
  const candidate = value?.trim() || '/';
  const withLeadingSlash = candidate.startsWith('/') ? candidate : `/${candidate}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      return listFiles(fullPath).map((file) => `${entry.name}/${file}`);
    }
    return entry.isFile() ? [entry.name] : [];
  });
}

function readText(file) {
  return readFileSync(join(distDirectory, file.split('/').join(sep)), 'utf8');
}
