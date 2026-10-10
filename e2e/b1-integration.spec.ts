import { expect, test } from '@playwright/test';
import releaseGate from '../data/sc-b-v1-release-gate.json' with { type: 'json' };
const expectsScB = releaseGate.approved || process.env.VITE_SC_B_RELEASE_CANDIDATE === '1';

test('科目B production教材の2大問模試とオフライン本文・公式PDF導線', async ({
  context,
  page,
}) => {
  await page.goto('/#/');
  await page.waitForFunction(async () => {
    await navigator.serviceWorker?.ready;
    return navigator.serviceWorker?.controller !== null;
  });

  await page.getByRole('radio', { name: /科目B/ }).click();
  if (expectsScB) await expect(page.getByText(/5回・20大問を収録/)).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: '模試' }).click();
  if (expectsScB) {
    await expect(page.getByText('4問から2問を選び、150分で解答します。')).toBeVisible();
    await expect(page.getByRole('combobox', { name: '試験回' }).locator('option')).toHaveCount(5);
  } else {
    await expect(page.getByText(/2大問・90分/)).toBeVisible();
  }

  await page.getByRole('checkbox').nth(0).check();
  await page.getByRole('checkbox').nth(1).check();
  if (expectsScB) {
    await page.getByRole('button', { name: '150分模試を開始する' }).click();
    const bodyTab = page.getByRole('tab', { name: '本文・図表' });
    if (await bodyTab.isVisible()) await bodyTab.click();
    await expect(page.locator('p.b1-original-text[id]')).not.toHaveCount(0);
  } else {
    await page.getByRole('button', { name: '開始内容を確認する' }).click();
    await expect(
      page.getByRole('heading', { name: 'この内容で科目B模試を開始しますか？' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'この内容で開始する' }).click();
  }
  await expect(page.getByRole('link', { name: '公式PDFを開く' })).toBeVisible();
  await expect(page.getByText(/残り時間/)).toBeVisible();
  await expect(page.getByText('何を確認して答えるか')).toHaveCount(0);
  await expect(page.getByText(/^(?:公式根拠|教材の根拠)$/)).toHaveCount(0);
  await expect(page.getByText('A2連動復習')).toHaveCount(0);

  await context.setOffline(true);
  await page.reload();
  if (expectsScB) {
    const bodyTab = page.getByRole('tab', { name: '本文・図表' });
    if (await bodyTab.isVisible()) await bodyTab.click();
  }
  await expect(page.getByRole('link', { name: '公式PDFを開く' })).toBeVisible();
  if (expectsScB) {
    const body = page.getByRole('region', { name: '問題本文・図表' });
    await expect(body.locator('p.b1-original-text[id]')).not.toHaveCount(0);
    await expect(body.locator('[data-material-id]')).not.toHaveCount(0);
  } else {
    await expect(page.getByText(/問題本文を表示できません/)).toBeVisible();
  }
});

test('科目B training records evidence and reveals reflection after confirmed completion', async ({
  page,
}) => {
  await page.goto('/#/');
  await page.getByRole('radio', { name: /科目B/ }).click();
  await page.getByRole('navigation').getByRole('link', { name: '演習' }).click();
  if (expectsScB) await expect(page.getByRole('button', { name: 'この大問を練習する' })).toHaveCount(20);
  await page.getByRole('button', { name: 'この大問を練習する' }).first().click();

  await expect(page.getByRole('heading', { name: '何を確認して答えるか' })).toBeVisible();
  await page.getByLabel('メモ').fill('図と本文を照合した。');
  await page.getByRole('button', { name: '根拠を追加' }).click();
  await expect(page.getByText(/根拠 1件/)).toBeVisible();
  await expect(page.getByText(/^(?:公式根拠|教材の根拠)$/)).toHaveCount(0);

  const answerFields = page.locator('.b1-answer-form input, .b1-answer-form textarea');
  for (let index = 0; index < (await answerFields.count()); index += 1) {
    await answerFields.nth(index).fill(`回答${index + 1}`);
  }
  await page.getByRole('button', { name: '回答を確定して模範解答を確認する' }).click();
  await expect(page.getByText('模範解答・解答例').first()).toBeVisible();

  await page.getByRole('button', { name: '演習を完了して確認する' }).click();
  await page.getByRole('button', { name: '完了する' }).click();
  await expect(page.getByText(expectsScB ? '教材の根拠' : '公式根拠', { exact: true })).toBeVisible();
  await expect(page.getByText('A2連動復習')).toBeVisible();
});

test('科目B practical hides requirement breakdown until the learner asks to view it', async ({
  page,
}) => {
  await page.goto('/#/');
  await page.getByRole('radio', { name: /科目B/ }).click();
  await page.getByRole('navigation').getByRole('link', { name: '演習' }).click();
  await page.getByRole('radio', { name: /実践/ }).check();
  await page.getByRole('button', { name: 'この大問を練習する' }).first().click();

  await expect(page.getByRole('button', { name: '設問の読み方を見る' })).toBeVisible();
  await expect(page.getByText('何を答えるか')).toHaveCount(0);
  await page.getByRole('button', { name: '設問の読み方を見る' }).click();
  await expect(page.getByText('何を答えるか')).toBeVisible();
});
