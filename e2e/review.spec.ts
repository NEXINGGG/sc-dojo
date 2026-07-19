import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

interface QuestionSeed {
  correct_choice: string;
  choices: Array<{ id: string }>;
}

test('誤答復習で正解すると、現在間違えている問題から外れる', async ({ page }) => {
  const source = JSON.parse(
    await readFile(new URL('../data/questions.json', import.meta.url), 'utf8'),
  ) as { questions: QuestionSeed[] };
  const firstQuestion = source.questions[0];
  const incorrectChoice = firstQuestion.choices.find(
    (choice) => choice.id !== firstQuestion.correct_choice,
  );
  if (incorrectChoice === undefined) {
    throw new Error('誤答用の選択肢を取得できませんでした。');
  }

  await page.goto('/#/practice');
  await page.getByRole('button', { name: 'この条件で始める' }).click();
  await page.locator(`input[name="practice-answer"][value="${incorrectChoice.id}"]`).check();
  await page.getByRole('button', { name: '回答する' }).click();
  await expect(page.getByRole('status')).toContainText('不正解です');

  await page.goto('/#/practice');
  const incorrectFilter = page.getByRole('radio', { name: /現在間違えている/ });
  await incorrectFilter.check();
  await expect(page.getByText('出題予定: 1問')).toBeVisible();
  await page.getByRole('button', { name: 'この条件で始める' }).click();
  const replaceDialog = page.getByRole('dialog', { name: '前回の通常演習があります' });
  await expect(replaceDialog).toBeVisible();
  await replaceDialog.getByRole('button', { name: '前回を破棄して新しく開始' }).click();
  await expect(page.getByRole('heading', { name: '1 / 1 問' })).toBeVisible();
  await page
    .locator(`input[name="practice-answer"][value="${firstQuestion.correct_choice}"]`)
    .check();
  await page.getByRole('button', { name: '回答する' }).click();
  await expect(page.getByRole('status')).toContainText('正解です');
  await page.getByRole('button', { name: '結果を見る' }).click();

  await page.getByRole('link', { name: '演習' }).click();
  await expect(page.getByRole('heading', { name: '通常演習' })).toBeVisible();
  await expect(page.getByRole('radio', { name: /現在間違えている/ })).toBeDisabled();
});
