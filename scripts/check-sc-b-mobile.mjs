import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { localTestPort } from '../e2e/fixtures/local-test-port.mjs';

const payload = JSON.parse(readFileSync('data/sc-b-cases-2023-2025-ready.json', 'utf8'));
const cs = payload.cases;
const max = (items, length) => items.toSorted((a, b) => length(b) - length(a))[0];
const materials = cs.flatMap((c) => c.body.materials.map((m) => ({ c, m })));
const units = cs.flatMap((c) => c.questionUnits.map((u) => ({ c, u })));
const longest = max(cs, (c) => c.body.sections.flatMap((s) => s.paragraphs).reduce((n,p) => n+p.text.length, 0));
const table = max(materials.filter(({ m }) => m.rows), ({ m }) => m.rows.length * m.headers.length);
const code = max(materials.filter(({ m }) => ['code','log'].includes(m.kind) && m.renderText), ({ m }) => m.text.length);
const log = max(materials.filter(({ m }) => m.kind === 'log' && m.renderText), ({ m }) => m.text.length);
const image = max(materials.filter(({ m }) => m.assetUrl), ({ m }) => readFileSync('public' + m.assetUrl).length);
const fields = max(units, ({ u }) => u.answerFields.length);
const explanation = max(units, ({ u }) => Object.values(u.explanation).join('').length);
const cases = [
  { name: 'longest-body', c: longest },
  { name: 'largest-table', ...table },
  { name: 'longest-code', ...code },
  { name: 'longest-log', ...log },
  { name: 'largest-material-image', ...image },
  { name: 'most-answer-fields', ...fields },
  { name: 'longest-explanation', ...explanation },
  { name: 'merged-vlan-table', c: cs[1], m: cs[1].body.materials.find((m) => m.id === 'table-3') },
  { name: 'reconstructed-network', c: cs[1], m: cs[1].body.materials.find((m) => m.id === 'figure-1') },
];
const dest = resolve('tmp/sc-b-completion/ui');
mkdirSync(dest, { recursive: true });
process.env.VITE_SC_B_PILOT = '';
process.env.VITE_SC_B_RELEASE_CANDIDATE = '1';
const server = await createServer({ server: { host: 'localhost', port: await localTestPort(), strictPort: true } });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ headless: true, args: ['--enable-logging=stderr'],
  env: { ...process.env, CHROME_LOG_FILE: resolve('tmp/sc-b-completion/qa-chrome.log') } });
const results = [];
try {
  for (const target of cases) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    try {
      const page = await context.newPage();
      page.setDefaultTimeout(30_000);
      await page.goto(url + '#/', { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await page.getByRole('radio', { name: /科目B/ }).click();
      await page.goto(url + '#/practice');
      for (const [label,value] of [['年度',target.c.year],['期',target.c.term],['大問',target.c.questionNumber]])
        await page.getByRole('combobox', { name: label, exact: true }).selectOption(String(value));
      await page.getByRole('button', { name: 'この大問を練習する' }).click();
      await page.getByRole('tab', { name: '本文・図表' }).click();
      const body = page.getByRole('region', { name: '問題本文・図表' });
      if (target.m) {
        const material = body.locator(`[data-material-id="${target.m.id}"]`);
        const details = material.locator('details').first();
        if (await details.count()) await details.evaluate((d) => d.open = true);
        await material.scrollIntoViewIfNeeded();
        for (const img of await material.locator('img').all()) {
          if (!await img.isVisible()) continue;
          await img.scrollIntoViewIfNeeded();
          await img.evaluate((i) => i.decode());
          if (await img.evaluate((i) => i.classList.contains('b1-source-image-full')) &&
              !await img.evaluate((i) => Math.abs(i.getBoundingClientRect().width - i.naturalWidth) < 1))
            throw new Error(target.name + ':図の原寸拡大が縮小されています');
        }
      } else if (target.u) {
        await page.getByRole('tab', { name: '答案', exact: true }).click();
        await page.getByRole('combobox', { name: '設問を選ぶ' }).selectOption({ label: `問${target.c.questionNumber} ${target.u.label}` });
        if (target.name === 'longest-explanation') {
          for (const field of await page.locator('.b1-answer-field input:enabled,.b1-answer-field textarea:enabled').all()) await field.fill('確認');
          await page.getByRole('button', { name: '回答を確定して模範解答を確認する' }).click();
          await page.getByRole('heading', { name: '学習用解説' }).scrollIntoViewIfNeeded();
        }
      }
      for (const width of [390,320]) {
        await page.setViewportSize({ width, height: 844 });
        for (const theme of ['light','dark']) {
          await page.evaluate((theme) => document.documentElement.dataset.theme = theme, theme);
          if (target.name === 'longest-body') await body.locator('p.b1-original-text[id]').first().scrollIntoViewIfNeeded();
          if (target.name === 'most-answer-fields') await page.locator('.b1-answer-fieldset legend').scrollIntoViewIfNeeded();
          if (target.name === 'longest-explanation') await page.getByRole('heading', { name: '学習用解説' }).scrollIntoViewIfNeeded();
          const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
          await page.screenshot({ path: resolve(dest, `${target.name}-${width}-${theme}.png`) });
          if (!fits) {
            const overflow = await page.evaluate(() => [...document.querySelectorAll('body *')]
              .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
              .map((e) => ({ tag: e.tagName, cls: e.className, right: e.getBoundingClientRect().right, text: e.textContent.slice(0,80) })));
            throw new Error(`${target.name}/${width}/${theme}:ページ横溢れ ` + JSON.stringify(overflow));
          }
        }
      }
      results.push({ name: target.name, source_id: target.c.source_id,
        materialId: target.m?.id, questionId: target.u?.questionId, widths: [390,320], themes: ['light','dark'], horizontalOverflow: false });
    } finally { await context.close(); }
  }
  const diagram = await browser.newPage({ viewport: { width: 1080, height: 860 } });
  await diagram.goto(url + 'questions/sc/b/2023-fall/q2-figure-1.svg');
  await diagram.screenshot({ path: resolve(dest,'network-svg.png') });
} finally { await browser.close(); await server.close(); }
writeFileSync(resolve(dest,'results.json'), JSON.stringify(results, null, 2) + '\n');
console.log('SC B表示確認: ' + results.length + '代表教材 × 390/320px × light/dark 横溢れなし');
