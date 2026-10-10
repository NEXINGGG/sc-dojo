import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { RawQuestion, RawQuestionPayload } from '../src/data/catalog';

const project = fileURLToPath(new URL('../', import.meta.url));
const payload = JSON.parse(
  readFileSync(
    resolve(
      project,
      process.env.SC_A1_CANDIDATE === '1' ? 'data/sc-a1-v1-candidate.json' : 'data/questions.json',
    ),
    'utf8',
  ),
) as RawQuestionPayload;
const categories = JSON.parse(readFileSync(resolve(project, 'data/categories.json'), 'utf8')) as {
  categories: Array<{ id: string; name: string }>;
};
const imagePaths = [
  ...new Set(
    payload.questions
      .flatMap((q) => [...(q.stimulus ?? []), ...q.choices.flatMap((c) => c.stimulus ?? [])])
      .flatMap((s) => (s.type === 'image' ? [s.src] : [])),
  ),
];
const captureStyle = '.practice-action-bar, .bottom-navigation { visibility: hidden !important; }';
test.use({ actionTimeout: 10_000 });

async function verifyMaterials(page: Page, q: RawQuestion) {
  const stimuli = [...(q.stimulus ?? []), ...q.choices.flatMap((c) => c.stimulus ?? [])];
  await expect(page.locator('.question-text')).toHaveText(q.question);
  await expect(page.getByRole('table')).toHaveCount(
    stimuli.filter((s) => s.type === 'table').length,
  );
  for (const s of stimuli) {
    if (s.type === 'code')
      await expect(page.getByLabel(s.caption ?? 'コード')).toHaveText(s.content);
    if (s.type === 'image') {
      const img = page.getByRole('img', { name: s.alt, exact: true });
      await expect(img).toBeVisible();
      await expect
        .poll(() => img.evaluate((e) => (e as HTMLImageElement).naturalWidth))
        .toBeGreaterThan(0);
    }
  }
  return stimuli.length > 0;
}

async function verifyExplanation(page: Page, q: RawQuestion) {
  await expect(page.getByText(q.explanation, { exact: true })).toBeVisible();
  await expect(page.getByText(q.memory_point, { exact: true })).toBeVisible();
  if (q.choice_explanations) {
    await expect(page.getByRole('region', { name: '選択肢ごとの解説' }).locator('dd')).toHaveText(
      ['A', 'B', 'C', 'D'].map((id) => q.choice_explanations![id as 'A' | 'B' | 'C' | 'D']),
    );
    await expect(page.getByText(q.exam_tip!, { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'IPA公式問題' })).toHaveAttribute(
      'href',
      q.source.official_question_url!,
    );
  }
}

async function captureMaterial(page: Page, q: RawQuestion, selector: string) {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const theme of ['light', 'dark']) {
      await page.evaluate((theme) => {
        document.documentElement.dataset.theme = theme;
      }, theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (width === 320 || theme === 'light')
        await page.locator(selector).screenshot({
          path: resolve(project, `tmp/sc-a1-v1/ui/${q.source.source_id}-${width}-${theme}.png`),
          style: captureStyle,
        });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'light';
  });
}

test('正式240問を本番PWAで全問回答し，図表・解説・復習・履歴・成績・固定模試を確認する', async ({
  page,
  context,
}) => {
  // Includes 180 practice answers, both 30-question mocks and material captures.
  test.setTimeout(900_000);
  mkdirSync(resolve(project, 'tmp/sc-a1-v1/ui'), { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#/');
  await expect(page.getByText('0 / 240問')).toBeVisible();
  await expect(page.getByRole('link', { name: /未回答を学習.*180問/ })).toBeVisible();
  await expect(page.getByText(/教材試作・30問/)).toHaveCount(0);
  await page.screenshot({ path: resolve(project, 'tmp/sc-a1-v1/ui/home.png'), fullPage: true });
  await page.waitForFunction(async () => {
    await navigator.serviceWorker.ready;
    return navigator.serviceWorker.controller !== null;
  });
  await page.reload();
  await expect(page.getByText('0 / 240問')).toBeVisible();
  // Fetch every asset for the first time only after disconnecting the network.
  await context.setOffline(true);
  const cached = await page.evaluate(
    async (paths) =>
      Promise.all(
        paths.map(async (src) => {
          try {
            const r = await fetch(new URL(src, location.href));
            return { src, ok: r.ok, bytes: (await r.arrayBuffer()).byteLength };
          } catch {
            return { src, ok: false, bytes: 0 };
          }
        }),
      ),
    imagePaths,
  );
  expect(cached).toHaveLength(6);
  expect(cached.filter((r) => !r.ok || r.bytes === 0)).toEqual([]);
  await page.reload();
  await page.goto('/#/practice');
  await page.locator('input[name="question-count"]').last().check();
  await expect(page.getByText('出題予定: 180問')).toBeVisible();
  for (const c of categories.categories)
    await expect(
      page.getByRole('checkbox', {
        name: new RegExp(c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      }),
    ).toBeVisible();
  const firstCategory = categories.categories[0];
  const categoryCheckbox = page.getByRole('checkbox', {
    name: new RegExp(firstCategory.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
  });
  await categoryCheckbox.check();
  const categoryCount = payload.questions.filter(
    (q) => q.category_id === firstCategory.id && q.question_set.id === 'category_drill',
  ).length;
  await expect(page.getByText(`出題予定: ${categoryCount}問`)).toBeVisible();
  await categoryCheckbox.uncheck();
  await page.screenshot({
    path: resolve(project, 'tmp/sc-a1-v1/ui/categories.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'この条件で始める' }).click();
  const practice = payload.questions.filter((q) => q.question_set.id === 'category_drill');
  for (const [index, q] of practice.entries()) {
    await expect(
      page.getByRole('heading', { name: `${index + 1} / 180 問`, exact: true }),
    ).toBeVisible();
    const hasMaterial = await verifyMaterials(page, q);
    await expect(page.locator('input[name="practice-answer"]')).toHaveCount(4);
    await expect(page.getByRole('heading', { name: '解説', exact: true })).toHaveCount(0);
    const selected =
      index === 0 ? q.choices.find((c) => c.id !== q.correct_choice)!.id : q.correct_choice;
    await page.locator(`input[name="practice-answer"][value="${selected}"]`).check();
    await page.getByRole('button', { name: '回答する' }).click();
    await expect(page.locator('.answer-feedback-status')).toHaveText(
      index === 0 ? '不正解です' : '正解です',
    );
    await verifyExplanation(page, q);
    if (hasMaterial || index === 0 || q.code === 'A1-174')
      await captureMaterial(page, q, '.practice-question-card');
    if (index === 0) {
      await page.getByRole('button', { name: '☆ お気に入りに追加' }).click();
      await page.reload();
      await expect(page.getByRole('button', { name: '★ お気に入り登録済み' })).toBeVisible();
      await page.getByRole('link', { name: 'この問題の学習履歴を見る' }).click();
      await expect(page.locator('.attempt-history-list li')).toHaveCount(1);
      await page.getByText('正解と解説を表示する').click();
      await verifyExplanation(page, q);
      await page.screenshot({
        path: resolve(project, 'tmp/sc-a1-v1/ui/history.png'),
        fullPage: true,
      });
      await page.getByRole('button', { name: '前の画面へ戻る' }).click();
    }
    await page
      .getByRole('button', { name: index === practice.length - 1 ? '結果を見る' : '次の問題' })
      .click();
  }
  await expect(page.getByRole('heading', { name: '通常演習の結果' })).toBeVisible();
  await page.goto('/#/');
  await expect(page.getByLabel('未回答を学習: 現在ありません')).toBeVisible();
  await page.goto('/#/progress');
  await expect(page.getByText('180 / 240問')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'カテゴリ別成績' })).toBeVisible();
  await page.screenshot({ path: resolve(project, 'tmp/sc-a1-v1/ui/progress.png'), fullPage: true });
  await page.goto('/#/practice');
  for (const name of [/お気に入り/, /現在間違えている/]) {
    await page.getByRole('radio', { name }).check();
    await expect(page.getByText('出題予定: 1問')).toBeVisible();
  }
  await page.getByRole('button', { name: 'この条件で始める' }).click();
  await page
    .locator(`input[name="practice-answer"][value="${practice[0].correct_choice}"]`)
    .check();
  await page.getByRole('button', { name: '回答する' }).click();
  await page.getByRole('button', { name: '結果を見る' }).click();
  await expect(page.getByRole('heading', { name: '通常演習の結果' })).toBeVisible();
  for (const number of [1, 2]) {
    const mock = payload.questions
      .filter((q) => q.question_set.id === `mock_exam_${number}`)
      .sort((a, b) => (a.question_set.sequence ?? 0) - (b.question_set.sequence ?? 0));
    await page.goto('/#/exam');
    await page.getByRole('button', { name: `固定模試${number}を選ぶ` }).click();
    await page.getByRole('button', { name: '模試を開始する' }).click();
    for (const [index, q] of mock.entries()) {
      await expect(
        page.getByRole('heading', { name: `${index + 1} / 30 問`, exact: true }),
      ).toBeVisible();
      await verifyMaterials(page, q);
      await expect(page.getByRole('heading', { name: '解説', exact: true })).toHaveCount(0);
      await page.locator(`input[name="exam-answer"][value="${q.correct_choice}"]`).check();
      if (index < 29) await page.getByRole('button', { name: '次の問題' }).click();
    }
    await page.getByRole('button', { name: '提出する', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: '提出する', exact: true }).click();
    await expect(page.getByRole('heading', { name: '合格', exact: true })).toBeVisible();
    await expect(page.getByText('30 / 30問', { exact: true })).toBeVisible();
    for (const [index, q] of mock.entries()) {
      const hasMaterial = await verifyMaterials(page, q);
      await verifyExplanation(page, q);
      if (hasMaterial) await captureMaterial(page, q, '.exam-result-question');
      if (index < 29) await page.getByRole('button', { name: '次の問題' }).click();
    }
    await page.screenshot({
      path: resolve(project, `tmp/sc-a1-v1/ui/mock${number}-result.png`),
      fullPage: true,
    });
  }
  await page.goto('/#/progress');
  await expect(page.getByText('240 / 240問')).toBeVisible();
  await context.setOffline(false);
  expect(errors).toEqual([]);
});
