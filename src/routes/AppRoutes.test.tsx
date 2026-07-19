import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../App';

afterEach(() => {
  cleanup();
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

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
  });

  it('存在しないURLで専用画面を表示する', async () => {
    renderRoute('/unknown-path');

    expect(
      await screen.findByRole('heading', { name: 'ページが見つかりません' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ホームへ戻る' })).toBeInTheDocument();
  });

  it('主要ナビゲーションとテーマ切替にアクセシブルな名前がある', async () => {
    renderRoute('/');

    await screen.findByRole('heading', { name: 'ホーム' });
    for (const label of ['ホーム', '演習', '模試', '成績', '設定']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
    expect(
      screen.getByRole('button', { name: 'テーマをダークモードに切り替え' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '通常演習を始める' })).toBeInTheDocument();
  });
});
