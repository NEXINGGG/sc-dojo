import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { validateQuestionPrecache } from './validate-question-precache.mjs';

// Read-only release audit. Never print environment values or matched credentials.
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const json = (path) => JSON.parse(readFileSync(path, 'utf8'));
const distDirectory = process.argv[2] ?? 'dist';
const errors = [];
const check = (ok, message) => {
  if (!ok) errors.push(message);
};
const files = (root) =>
  readdirSync(root, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(root, entry.name)) : [join(root, entry.name)],
  );
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const a1 = json('data/questions.json');
const a2 = json('data/a2-questions.json');
const b = json('data/sc-b-cases-2023-2025-ready.json');
const units = b.cases.flatMap((c) => c.questionUnits);
const fields = units.flatMap((u) => u.answerFields);
const verified = json('data/sc-b-v1-source-map.json').entries.filter((entry) =>
  [
    'transcription_status',
    'answer_review_status',
    'figure_review_status',
    'content_review_status',
    'commentary_review_status',
  ].every((key) => entry[key] === 'verified'),
).length;
check(a1.metadata.dataset_version === 'sc-a1-v1' && a1.questions.length === 240, 'A-1正式240問');
check(a2.metadata.dataset_version === 'sc-a2-v1' && a2.questions.length === 240, 'A-2正式240問');
check(
  b.dataset_version === 'sc-b-v1' &&
    b.cases.length === 20 &&
    units.length === 181 &&
    fields.filter((f) => !f.gradingExcluded).length === 290 &&
    verified === 20,
  'B件数・20/20 verified',
);
check(json('data/sc-b-v1-release-gate.json').approved === true, 'B production gate');
const counts = (payload) =>
  Object.fromEntries(
    ['mock_exam_1', 'mock_exam_2'].map((id) => [
      id,
      payload.questions.filter((q) => q.question_set.id === id).length,
    ]),
  );
check(
  Object.values(counts(a1)).every((n) => n === 30),
  'A-1固定模試',
);
check(
  Object.values(counts(a2)).every((n) => n === 25),
  'A-2固定模試',
);

const tracked = git('ls-files').split('\n');
const candidates = git('ls-files', '--cached', '--others', '--exclude-standard').split('\n');
check(
  !tracked.some((p) => /(^|\/)\.env(?:\.|$)/.test(p) && p !== '.env.example'),
  '環境ファイルのGit混入',
);
check(
  !candidates.some((p) =>
    /^(tmp|dist|node_modules|test-results|playwright-report|\.wrangler)\//.test(p),
  ),
  '一時・生成物のGit候補混入',
);
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:ghp_|github_pat_|glpat-|sb_secret_)[A-Za-z0-9_-]{20,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}/,
  /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}/,
];
const hasPrivateCredential = (content) =>
  patterns.some((pattern) => pattern.test(content)) ||
  [...content.matchAll(/\beyJ[\w-]+\.(eyJ[\w-]+)\.[\w-]+/g)].some((match) => {
    try {
      return ['service_role', 'authenticated'].includes(
        JSON.parse(Buffer.from(match[1], 'base64url')).role,
      );
    } catch {
      return false;
    }
  });
const textFile = /\.(?:[cm]?[jt]sx?|json|ya?ml|toml|md|html|css|svg|txt|py|ps1|sql)$|(?:^|\/)\.env/;
const findings = [];
for (const path of candidates.filter((p) => textFile.test(p))) {
  if (!existsSync(path)) continue;
  const content = readFileSync(path, 'utf8');
  if (hasPrivateCredential(content)) findings.push(path);
}
check(findings.length === 0, 'Git候補の秘密情報パターン検出（値は非表示）');
const revisions = git('rev-list', '--all').split('\n');
let historyFindings = [];
try {
  historyFindings = git(
    'grep',
    '-l',
    '-I',
    '-E',
    'BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sb_secret_[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|sk-(proj-|svcacct-)?[A-Za-z0-9_-]{32,}',
    ...revisions,
    '--',
  )
    .split('\n')
    .filter(Boolean);
} catch (error) {
  if (error.status !== 1) throw error;
}
check(historyFindings.length === 0, '到達可能なGit履歴の秘密情報パターン');
const environment = [];
for (const path of ['.env', '.env.local', '.env.production', '.env.production.local']) {
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_]\w*)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, raw] = match;
    const value = raw.replace(/^['"]|['"]$/g, '').trim();
    let kind = value ? 'non-public' : 'empty';
    if (key === 'VITE_SUPABASE_URL') kind = 'public-url';
    if (key === 'VITE_SUPABASE_PUBLISHABLE_KEY' && value) {
      let role;
      try {
        role = JSON.parse(Buffer.from(value.split('.')[1], 'base64url')).role;
      } catch {
        /* newer key */
      }
      kind =
        value.startsWith('sb_publishable_') || role === 'anon'
          ? 'public-browser-key'
          : 'unexpected-key';
      check(kind === 'public-browser-key', `${path}:${key} ブラウザ公開鍵以外`);
    }
    environment.push({ path, key, configured: Boolean(value), kind });
    check(
      !(key.startsWith('VITE_') && kind === 'non-public' && value),
      `${path}:${key} 未分類の公開環境変数`,
    );
  }
}

const dist = files(distDirectory);
const js = dist.filter((p) => p.endsWith('.js'));
const bundle = js.map((p) => readFileSync(p, 'utf8')).join('\n');
check(!hasPrivateCredential(bundle), 'build成果物の秘密情報パターン');
check(
  !dist.some(
    (p) =>
      /\.map$|\.pdf$|\.env|debug/i.test(p) ||
      (/pilot/i.test(p) && readFileSync(p, 'utf8').trim() !== ''),
  ),
  '配布物のsource map/PDF/env/pilot/debug',
);
for (const version of ['sc-a1-v1', 'sc-a2-v1', 'sc-b-v1'])
  check(bundle.includes(version), `${version} build接続`);
for (const version of ['sc-a2-pilot-v1', 'sc-b-pilot-2025-fall-v1', 'sc-b-pilot-v1'])
  check(!bundle.includes(version), `${version} pilot教材の混入`);
const manifest = json(join(distDirectory, 'manifest.webmanifest'));
check(
  manifest.id === '/sc-dojo' &&
    manifest.scope === '/' &&
    manifest.start_url === '/#/' &&
    manifest.short_name === 'SC道場',
  'manifest identity',
);
const sw = readFileSync(join(distDirectory, 'sw.js'), 'utf8');
check(sw.includes('sc-dojo') && !sw.includes('cleanupOutdatedCaches('), 'SC cache分離');
errors.push(...validateQuestionPrecache('public', distDirectory, sw));
const assets = js
  .map((path) => ({
    path: path.replaceAll('\\', '/'),
    bytes: statSync(path).size,
    gzipBytes: gzipSync(readFileSync(path)).length,
  }))
  .sort((a, c) => c.bytes - a.bytes);
const report = {
  auditedAt: new Date().toISOString(),
  gitHead: git('rev-parse', 'HEAD'),
  trackedFiles: tracked.length,
  untrackedFiles: git('ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean)
    .length,
  credentialPatternFindings: findings,
  historyRevisions: revisions.length,
  historyFindings,
  environment,
  datasets: {
    a1: a1.metadata.dataset_version,
    a2: a2.metadata.dataset_version,
    b: b.dataset_version,
  },
  counts: {
    a1: a1.questions.length,
    a2: a2.questions.length,
    b: b.cases.length,
    bUnits: units.length,
    bDefinedFields: fields.length,
    bEffectiveFields: fields.filter((f) => !f.gradingExcluded).length,
    verified,
  },
  mockExams: { a1: counts(a1), a2: counts(a2), b: json('data/sc-b-exam-sets.json').sets.length },
  manifest,
  distFiles: dist.length,
  distBytes: dist.reduce((n, p) => n + statSync(p).size, 0),
  precacheEntries: [...sw.matchAll(/(?:"url"|url)\s*:\s*["']/g)].length,
  distSha256: sha256(
    dist
      .map((p) => `${p.replaceAll('\\', '/')}:${sha256(readFileSync(p))}`)
      .sort()
      .join('\n'),
  ),
  assets,
  errors,
};
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
