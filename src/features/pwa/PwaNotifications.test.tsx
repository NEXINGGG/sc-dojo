import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { database } from '../../database/database';
import { pwaRegisterMock } from '../../test/pwaRegisterMock';
import { questions } from '../../data/catalog';
import { createExamSession } from '../../domain/exam';
import { b1Cases } from '../../data/b1';
import { B1Repository } from '../b1/b1Repository';

let b1UpdateSessionId: string | undefined;

function renderAt(path: string) {
  window.location.hash = `#${path}`;
  render(<App />);
}

function enableServiceWorkerSupport() {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {},
  });
}

function registerServiceWorker() {
  act(() =>
    pwaRegisterMock.options?.onRegisteredSW?.('/sw.js', {
      update: vi.fn(() => Promise.resolve(undefined)),
      waiting: null,
    } as unknown as ServiceWorkerRegistration),
  );
}

afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  await database.examSessions.delete('pwa-update-exam');
  if (b1UpdateSessionId !== undefined) await database.b1MockSessions.delete(b1UpdateSessionId);
  b1UpdateSessionId = undefined;
  Reflect.deleteProperty(navigator, 'serviceWorker');
  window.location.hash = '#/';
  window.localStorage.clear();
});

describe('PWA通知', () => {
  it('needRefreshがtrueなら新しいバージョンの通知を表示する', async () => {
    enableServiceWorkerSupport();
    pwaRegisterMock.needRefresh = true;
    renderAt('/');

    expect(await screen.findByText('新しいバージョンがあります')).toBeInTheDocument();
  });

  it('新バージョンの通知は自動更新せず、利用者の操作でだけ適用する', async () => {
    enableServiceWorkerSupport();
    const user = userEvent.setup();
    renderAt('/');
    await screen.findByRole('heading', { name: 'ホーム' });
    registerServiceWorker();

    act(() => pwaRegisterMock.options?.onNeedRefresh?.());
    expect(screen.getByText('新しいバージョンがあります')).toBeInTheDocument();
    expect(pwaRegisterMock.updateServiceWorker).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '後で' }));
    expect(screen.queryByText('新しいバージョンがあります')).not.toBeInTheDocument();
    expect(pwaRegisterMock.updateServiceWorker).not.toHaveBeenCalled();

    act(() => pwaRegisterMock.options?.onNeedRefresh?.());
    expect(screen.getByText('新しいバージョンがあります')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '更新する' }));
    await waitFor(() => expect(pwaRegisterMock.updateServiceWorker).toHaveBeenCalledWith(true));
  });

  it('模試中は更新前に保存確認を表示する', async () => {
    enableServiceWorkerSupport();
    const user = userEvent.setup();
    // A nonexistent session redirects asynchronously; test an actual ongoing exam.
    await database.examSessions.put(
      createExamSession(
        'fixed_1',
        questions.slice(180, 210).map((question) => question.code),
        { id: 'pwa-update-exam', now: new Date().toISOString() },
      ),
    );
    renderAt('/exam/pwa-update-exam');
    await screen.findByRole('heading', { name: '1 / 30 問' });
    registerServiceWorker();

    act(() => pwaRegisterMock.options?.onNeedRefresh?.());
    await user.click(screen.getByRole('button', { name: '更新する' }));
    const dialog = screen.getByRole('dialog', { name: '模試を保存して更新しますか？' });
    expect(dialog).toHaveTextContent('回答、現在位置、見直しはこの端末に保存してから更新します。');
    expect(pwaRegisterMock.updateServiceWorker).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: '模試を続ける' }));
  });

  it('オフライン準備完了の通知を一度だけ表示する', async () => {
    enableServiceWorkerSupport();
    renderAt('/');
    await screen.findByRole('heading', { name: 'ホーム' });

    act(() => pwaRegisterMock.options?.onOfflineReady?.());
    expect(screen.getByText('オフラインでも利用できるようになりました')).toBeInTheDocument();
  });

  it('科目B模試も更新前に保存確認し、キャンセルすると模試を継続する', async () => {
    enableServiceWorkerSupport();
    const user = userEvent.setup();
    const session = await new B1Repository(database).createMock(
      b1Cases[0].year,
      [b1Cases[0].caseId, b1Cases[1].caseId],
      'official_year',
    );
    b1UpdateSessionId = session.id;
    renderAt(`/b1/mock/${session.id}`);
    await screen.findAllByRole('heading', { name: '設問1(1)' });
    registerServiceWorker();
    act(() => pwaRegisterMock.options?.onNeedRefresh?.());
    await user.click(screen.getByRole('button', { name: '更新する' }));
    const dialog = screen.getByRole('dialog', { name: '模試を保存して更新しますか？' });
    expect(pwaRegisterMock.updateServiceWorker).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: '模試を続ける' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect((await database.b1MockSessions.get(session.id))?.status).toBe('in_progress');
  });

  it('更新適用は二重に実行しない', async () => {
    enableServiceWorkerSupport();
    const user = userEvent.setup();
    let resolveUpdate: (() => void) | undefined;
    pwaRegisterMock.updateServiceWorker.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveUpdate = resolve;
        }),
    );
    renderAt('/');
    await screen.findByRole('heading', { name: 'ホーム' });
    registerServiceWorker();
    act(() => pwaRegisterMock.options?.onNeedRefresh?.());

    const updateButton = screen.getByRole('button', { name: '更新する' });
    await user.click(updateButton);
    await user.click(updateButton);

    expect(pwaRegisterMock.updateServiceWorker).toHaveBeenCalledTimes(1);
    resolveUpdate?.();
    await waitFor(() => expect(updateButton).toBeDisabled());
  });

  it('学習状態の保存に失敗した場合は更新を適用しない', async () => {
    enableServiceWorkerSupport();
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(database, 'open').mockRejectedValue(new Error('save state failed'));
    renderAt('/');
    await screen.findByRole('heading', { name: 'ホーム' });
    registerServiceWorker();
    act(() => pwaRegisterMock.options?.onNeedRefresh?.());

    await user.click(screen.getByRole('button', { name: '更新する' }));

    expect(
      await screen.findByText(
        '学習状態を保存できなかったため、更新を適用していません。保存状態を確認してから再試行してください。',
      ),
    ).toBeInTheDocument();
    expect(pwaRegisterMock.updateServiceWorker).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('Error: save state failed'),
      expect.any(Error),
    );
  });

  it('更新適用の失敗を利用者向けに表示する', async () => {
    enableServiceWorkerSupport();
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    pwaRegisterMock.updateServiceWorker.mockRejectedValue(new Error('apply rejected'));
    renderAt('/');
    await screen.findByRole('heading', { name: 'ホーム' });
    registerServiceWorker();
    act(() => pwaRegisterMock.options?.onNeedRefresh?.());

    await user.click(screen.getByRole('button', { name: '更新する' }));

    expect(
      await screen.findByText(
        '更新を適用できませんでした。接続状態を確認して、もう一度お試しください。',
      ),
    ).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('Error: apply rejected'),
      expect.any(Error),
    );
  });
});
