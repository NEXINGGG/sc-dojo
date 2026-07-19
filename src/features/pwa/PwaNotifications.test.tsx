import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../../App';
import { pwaRegisterMock } from '../../test/pwaRegisterMock';

afterEach(() => {
  cleanup();
  window.location.hash = '#/';
  window.localStorage.clear();
});

function renderAt(path: string) {
  window.location.hash = `#${path}`;
  render(<App />);
}

describe('PWA通知', () => {
  it('新バージョンの通知は自動更新せず、利用者の操作でだけ適用する', async () => {
    const user = userEvent.setup();
    renderAt('/');

    act(() => pwaRegisterMock.options?.onNeedRefresh?.());
    expect(screen.getByText('新しいバージョンがあります')).toBeInTheDocument();
    expect(pwaRegisterMock.updateServiceWorker).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '後で' }));
    expect(screen.queryByText('新しいバージョンがあります')).not.toBeInTheDocument();
    expect(pwaRegisterMock.updateServiceWorker).not.toHaveBeenCalled();

    await user.click(screen.getByRole('link', { name: '設定', exact: true }));
    await user.click(screen.getByRole('button', { name: '更新のお知らせを再表示' }));
    await user.click(screen.getByRole('button', { name: '保存して更新する' }));
    await waitFor(() => expect(pwaRegisterMock.updateServiceWorker).toHaveBeenCalledWith(true));
  });

  it('模試中は更新前に保存確認を表示する', async () => {
    const user = userEvent.setup();
    renderAt('/exam/demo');

    act(() => pwaRegisterMock.options?.onNeedRefresh?.());
    await user.click(screen.getByRole('button', { name: '更新する' }));
    const dialog = screen.getByRole('dialog', { name: '模試を保存して更新しますか？' });
    expect(dialog).toHaveTextContent('回答、現在位置、見直しはこの端末に保存してから更新します。');
    expect(pwaRegisterMock.updateServiceWorker).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: '模試を続ける' }));
  });

  it('オフライン準備完了の通知を一度だけ表示する', () => {
    renderAt('/');

    act(() => pwaRegisterMock.options?.onOfflineReady?.());
    expect(screen.getByText('オフラインでも利用できるようになりました')).toBeInTheDocument();
  });
});
