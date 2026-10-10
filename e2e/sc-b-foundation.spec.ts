import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

test('SC B pilot: 4問→2問・150分・切替・保存・再開・根拠・自己採点・期限', async ({ browser }) => {
  test.setTimeout(180_000);
  const project = fileURLToPath(new URL('../', import.meta.url));
  const server = spawn(process.execPath, [resolve(project, 'e2e/fixtures/serve-sc-b-pilot.mjs')], {
    cwd: project,
    env: { ...process.env, VITE_SC_B_PILOT: 'foundation' },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const url = await new Promise<string>((done, reject) => {
      const timer = setTimeout(() => reject(new Error('SC B pilot起動失敗')), 20000);
      server.once('error', reject);
      server.stdout.on('data', (chunk: Buffer) => {
        const ready = chunk.toString().match(/READY (http:\/\/[^\s]+)/);
        if (ready) {
          clearTimeout(timer);
          done(ready[1]);
        }
      });
    });
    mkdirSync(resolve(project, 'tmp/sc-b-ui'), { recursive: true });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${url}#/`);
    await page.getByRole('radio', { name: /科目B/ }).click();
    await page.getByRole('link', { name: '科目B演習を始める' }).click();
    await expect(page.getByText('基礎・未着手')).toHaveCount(4);
    await page.getByRole('button', { name: 'この大問を練習する' }).first().click();
    await page
      .getByRole('textbox', { name: /理由/ })
      .first()
      .fill('担当者の権限と操作記録を照合する。');
    await page.getByRole('combobox', { name: '根拠種別' }).selectOption('log');
    await page
      .getByRole('textbox', { name: 'メモ' })
      .fill('L1の変更操作とP1の閲覧権限を照合した。');
    await page.getByRole('button', { name: '根拠を追加', exact: true }).click();
    await expect(page.getByText(/根拠を端末に保存しました。外部へ送信しません。/)).toBeVisible();
    await page.getByRole('button', { name: '回答を確定して模範解答を確認する' }).click();
    await expect(page.getByText('学習用の許容表現例', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '惜しい', exact: true }).first().click();
    await page.getByRole('button', { name: '演習を完了して確認する' }).click();
    await page.getByRole('button', { name: '完了する', exact: true }).click();
    await page.getByRole('checkbox', { name: '認証・認可の混同' }).check();
    await expect(page.getByText('失点原因を保存しました。')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('textbox', { name: /理由/ }).first()).toHaveValue(
      '担当者の権限と操作記録を照合する。',
    );
    await page.goto(`${url}#/exam`);
    const choices = page.getByRole('checkbox');
    await expect(choices).toHaveCount(4);
    const start = page.getByRole('button', { name: '150分模試を開始する' });
    await expect(start).toBeDisabled();
    await choices.nth(0).check();
    await expect(start).toBeDisabled();
    await choices.nth(2).check();
    await choices.nth(3).click();
    await expect(
      page.getByText('2問を選択済みです。先に選択した問題を解除してください。'),
    ).toBeVisible();
    await expect(choices.nth(3)).not.toBeChecked();
    await start.click();
    await expect(page.locator('.exam-timer')).toContainText(/149:|150:00/);
    await expect(page.getByText('模範解答と自分の回答を確認する')).toHaveCount(0);
    await page.getByRole('textbox', { name: /理由/ }).first().fill('問1の答案');
    await expect(page.getByText('答案はこの端末に自動保存されています。')).toBeVisible();
    await page.getByRole('button', { name: '見直しにする' }).click();
    await page
      .getByRole('navigation', { name: '大問切替' })
      .getByRole('button', { name: '問3', exact: true })
      .click();
    await page.getByRole('textbox', { name: /理由/ }).first().fill('問3の答案');
    await expect(page.getByText('答案はこの端末に自動保存されています。')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('textbox', { name: /理由/ }).first()).toHaveValue('問3の答案');
    const savedMockUrl = page.url();
    await page.goto(`${url}#/progress`);
    await expect(page.getByText('150分模試・途中から再開できます')).toBeVisible();
    await page.goto(savedMockUrl);
    await page
      .getByRole('navigation', { name: '大問切替' })
      .getByRole('button', { name: '問1', exact: true })
      .click();
    await expect(page.getByRole('textbox', { name: /理由/ }).first()).toHaveValue('問1の答案');
    await expect(page.getByRole('button', { name: '見直しを外す' })).toBeVisible();
    await page.getByRole('tab', { name: '本文・図表' }).click();
    const answerUrl = page.url();
    await page.getByText('本文内の移動', { exact: true }).click();
    await page
      .getByRole('navigation', { name: '本文の参照位置' })
      .getByRole('button')
      .last()
      .click();
    expect(page.url()).toBe(answerUrl);
    await expect(page.getByRole('region', { name: '問題本文・図表' })).toBeVisible();
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const theme of ['light', 'dark']) {
        await page.evaluate((theme) => {
          document.documentElement.dataset.theme = theme;
        }, theme);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await page.screenshot({
          path: resolve(project, `tmp/sc-b-ui/body-${width}-${theme}.png`),
          fullPage: true,
        });
      }
    }
    await page.getByRole('button', { name: '模試を提出する' }).click();
    await page.getByRole('button', { name: '提出する', exact: true }).click();
    await expect(page.getByText('学習用の許容表現例', { exact: true })).toBeVisible();
    for (let i = 0; i < 4; i++) {
      await page
        .getByRole('navigation', { name: '解答単位一覧' })
        .getByRole('button')
        .nth(i)
        .click();
      await page
        .getByRole('button', {
          name: i === 0 ? 'できた' : i === 1 ? '惜しい' : 'できなかった',
          exact: true,
        })
        .first()
        .click();
      await expect(page.getByText('答案はこの端末に自動保存されています。')).toBeVisible();
    }
    await page.getByRole('button', { name: '結果を確定する' }).click();
    await expect(page.getByRole('heading', { name: '結果を確定しました' })).toBeVisible();
    const completedMockUrl = page.url();
    await page
      .getByRole('navigation', { name: '大問切替' })
      .getByRole('button', { name: '問1', exact: true })
      .click();
    await page.getByRole('button', { name: '演習で答案を書き直す' }).click();
    await page.getByRole('textbox', { name: /理由/ }).first().fill('提出後に書き直した答案');
    await expect(page.getByText('答案はこの端末に自動保存されています。')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('textbox', { name: /理由/ }).first()).toHaveValue(
      '提出後に書き直した答案',
    );
    await page.goto(completedMockUrl);
    await expect(page.getByRole('textbox', { name: /理由/ }).first()).toHaveValue('問1の答案');
    await expect(page.getByRole('textbox', { name: /理由/ }).first()).toBeDisabled();
    await page.goto(`${url}#/exam`);
    await page.getByRole('checkbox').nth(0).check();
    await page.getByRole('checkbox').nth(1).check();
    await page.getByRole('button', { name: '150分模試を開始する' }).click();
    await page.getByRole('textbox', { name: /理由/ }).first().fill('時間切れ前の答案');
    await expect(page.getByText('答案はこの端末に自動保存されています。')).toBeVisible();
    // Move the browser clock past the persisted deadline, then restart the app.
    await page.clock.install();
    await page.clock.setSystemTime(new Date(Date.now() + 151 * 60 * 1000));
    await page.reload();
    await expect(page.getByRole('heading', { name: '自己採点を完了してください' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /理由/ }).first()).toHaveValue(
      '時間切れ前の答案',
    );
    await expect(page.getByRole('textbox', { name: /理由/ }).first()).toBeDisabled();
    await page.goto(`${url}#/exam`);
    await page.getByRole('checkbox').nth(0).check();
    await page.getByRole('checkbox').nth(1).check();
    await page.getByRole('button', { name: '150分模試を開始する' }).click();
    await page.getByRole('textbox', { name: /理由/ }).first().fill('表示中の時間切れ答案');
    await expect(page.getByText('答案はこの端末に自動保存されています。')).toBeVisible();
    await page.clock.fastForward(150 * 60 * 1000);
    await expect(page.getByRole('heading', { name: '自己採点を完了してください' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /理由/ }).first()).toHaveValue(
      '表示中の時間切れ答案',
    );
    await expect(page.getByRole('textbox', { name: /理由/ }).first()).toBeDisabled();
    expect(errors).toEqual([]);
  } finally {
    await context.close();
    server.kill();
  }
});
