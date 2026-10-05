import { expect, test } from '@playwright/test';

test('科目B starts a 90-minute two-case mock and keeps the official PDF route usable offline', async ({
  context,
  page,
}) => {
  await page.goto('/#/');
  await page.waitForFunction(async () => {
    await navigator.serviceWorker?.ready;
    return navigator.serviceWorker?.controller !== null;
  });

  await page.getByRole('radio', { name: /科目B/ }).click();
  await page.getByRole('navigation').getByRole('link', { name: '模試' }).click();
  await expect(page.getByText(/2大問・90分/)).toBeVisible();

  await page.getByRole('checkbox').nth(0).check();
  await page.getByRole('checkbox').nth(1).check();
  await page.getByRole('button', { name: '開始内容を確認する' }).click();
  await expect(
    page.getByRole('heading', { name: 'この内容で科目B模試を開始しますか？' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'この内容で開始する' }).click();
  await expect(page.getByRole('link', { name: '公式PDFを開く' })).toBeVisible();
  await expect(page.getByText(/残り時間/)).toBeVisible();
  await expect(page.getByText('何を確認して答えるか')).toHaveCount(0);
  await expect(page.getByText('公式根拠')).toHaveCount(0);
  await expect(page.getByText('A2連動復習')).toHaveCount(0);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('link', { name: '公式PDFを開く' })).toBeVisible();
  await expect(page.getByText(/問題本文を表示できません/)).toBeVisible();
});

test('科目B training records evidence and reveals reflection after confirmed completion', async ({
  page,
}) => {
  await page.goto('/#/');
  await page.getByRole('radio', { name: /科目B/ }).click();
  await page.getByRole('navigation').getByRole('link', { name: '演習' }).click();
  await page.getByRole('button', { name: 'この大問を練習する' }).first().click();

  await expect(page.getByRole('heading', { name: '何を確認して答えるか' })).toBeVisible();
  await page.getByLabel('メモ').fill('図と本文を照合した。');
  await page.getByRole('button', { name: '根拠を追加' }).click();
  await expect(page.getByText(/根拠 1件/)).toBeVisible();
  await expect(page.getByText('公式根拠')).toHaveCount(0);

  const answerFields = page.locator('.b1-answer-form input, .b1-answer-form textarea');
  for (let index = 0; index < (await answerFields.count()); index += 1) {
    await answerFields.nth(index).fill(`回答${index + 1}`);
  }
  await page.getByRole('button', { name: '回答を確定して模範解答を確認する' }).click();
  await expect(page.getByText('模範解答・解答例').first()).toBeVisible();

  await page.getByRole('button', { name: '演習を完了して確認する' }).click();
  await page.getByRole('button', { name: '完了する' }).click();
  await expect(page.getByText('公式根拠')).toBeVisible();
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
