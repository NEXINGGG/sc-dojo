import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { database } from '../database/database';
import { waitForRouteLoadingToFinish } from '../test/routeLoading';

beforeEach(async () => {
  await database.open();
  await database.settings.clear();
  database.close();
});

afterEach(async () => {
  cleanup();
  await database.open();
  await database.settings.clear();
  database.close();
  window.location.hash = '#/';
});

function renderRoute(path: string) {
  window.location.hash = `#${path}`;
  render(<App />);
}

describe('主要ルート', () => {
  it.each([
    ['/', 'ホーム'],
    ['/practice', '通常演習'],
    ['/exam', '模擬試験'],
    ['/exam/demo', '模擬試験を読み込んでいます'],
    ['/progress', '成績'],
    ['/settings', '設定'],
  ])('%s で %s を表示する', async (path, heading) => {
    renderRoute(path);

    await waitForRouteLoadingToFinish();
    expect(
      await screen.findByRole('heading', { name: heading }, { timeout: 5_000 }),
    ).toBeInTheDocument();
  });

  it('存在しないURLで専用画面を表示する', async () => {
    renderRoute('/unknown-path');

    await waitForRouteLoadingToFinish();
    expect(
      await screen.findByRole('heading', { name: 'ページが見つかりません' }, { timeout: 5_000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ホームへ戻る' })).toBeInTheDocument();
  });

  it('主要ナビゲーションとテーマ切替にアクセシブルな名前がある', async () => {
    renderRoute('/');

    await waitForRouteLoadingToFinish();
    await screen.findByRole('heading', { name: 'ホーム' }, { timeout: 5_000 });
    for (const label of ['ホーム', '演習', '模試', '成績', '設定']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
    expect(
      screen.getByRole('button', { name: 'テーマをダークモードに切り替え' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '通常演習を始める' })).toBeInTheDocument();
  });
});
