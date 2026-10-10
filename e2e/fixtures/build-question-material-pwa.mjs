import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { processQuestionContentHashes } from '../../scripts/question-material-data.mjs';
import { questionImageExtensions } from '../../src/features/pwa/questionAssets.mjs';
import { validateQuestionPrecache } from '../../scripts/validate-question-precache.mjs';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const temporary = resolve(process.argv[2]);
const publicDirectory = join(temporary, 'public');
const distDirectory = join(temporary, 'dist');
cpSync(join(project, 'public'), publicDirectory, { recursive: true });
mkdirSync(join(publicDirectory, 'questions/sc/a2'), { recursive: true });
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="180" viewBox="0 0 640 180"><rect width="640" height="180" fill="white"/><text x="20" y="90" fill="black">Client -- Router -- Server (test only)</text></svg>';
for (const extension of questionImageExtensions)
  writeFileSync(join(publicDirectory, `questions/sc/a2/test.${extension}`), svg);
const payload = JSON.parse(readFileSync(join(project, 'data/a2-questions.json'), 'utf8'));
// Keep the production 240-question shape and mock sets. Only this isolated build
// receives synthetic figures, never data/a2-questions.json or the normal dist/.
payload.questions[0].stimulus = [
  {
    type: 'table',
    headers: ['項目', '長い列見出し'.repeat(12)],
    rows: [['値', 'テストデータ']],
    caption: 'テスト用の表',
  },
  {
    type: 'code',
    content: `SELECT *\n  FROM ${'test_table_'.repeat(18)};`,
    caption: 'テスト用のコード',
  },
  {
    type: 'image',
    src: 'questions/sc/a2/test.svg',
    alt: 'テスト用の通信経路',
    caption: 'テスト用の図',
    asset_sha256: '',
  },
];
payload.questions[0].choices[0].stimulus = [
  { type: 'table', headers: ['選択肢の値'], rows: [['A']], caption: '選択肢の表' },
];
const firstMockQuestion = payload.questions
  .filter((question) => question.question_set.id === 'mock_exam_1')
  .sort((a, b) => a.question_set.sequence - b.question_set.sequence)[0];
firstMockQuestion.stimulus = structuredClone(payload.questions[0].stimulus);
firstMockQuestion.choices[0].stimulus = structuredClone(payload.questions[0].choices[0].stimulus);
const hashed = processQuestionContentHashes(payload, { mode: 'update', publicDirectory });
if (hashed.errors.length) throw new Error(hashed.errors.join('\n'));
process.env.VITE_APP_BASE = '/sc-material/';
await build({
  configFile: join(project, 'vite.config.ts'),
  root: project,
  publicDir: publicDirectory,
  logLevel: 'error',
  plugins: [
    {
      name: 'isolated-question-fixture',
      enforce: 'pre',
      load(id) {
        if (id.replaceAll('\\', '/').endsWith('/data/a2-questions.json'))
          return JSON.stringify(hashed.payload);
      },
    },
  ],
  build: { outDir: distDirectory, emptyOutDir: true },
});
const errors = validateQuestionPrecache(
  publicDirectory,
  distDirectory,
  readFileSync(join(distDirectory, 'sw.js'), 'utf8'),
);
if (errors.length) throw new Error(errors.join('\n'));
console.log('PASSED: all question image formats are present in the real PWA precache');
