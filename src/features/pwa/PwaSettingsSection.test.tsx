import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import packageMetadata from '../../../package.json';
import { App } from '../../App';
import { pwaRegisterMock } from '../../test/pwaRegisterMock';

function enableServiceWorkerSupport() {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {},
  });
}

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value,
  });
}

function createRegistration(update = vi.fn(() => Promise.resolve(undefined))) {
  return {
    update,
    waiting: null,
  } as unknown as ServiceWorkerRegistration;
}

function registerServiceWorker(registration: ServiceWorkerRegistration | undefined) {
  act(() => pwaRegisterMock.options?.onRegisteredSW?.('/sw.js', registration));
}

function renderSettings() {
  window.location.hash = '#/settings';
  render(<App />);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'serviceWorker');
  Reflect.deleteProperty(navigator, 'onLine');
  window.location.hash = '#/';
  window.localStorage.clear();
});

describe('PWA更新確認', () => {
  it('Service Worker未対応のブラウザでは理由を表示する', async () => {
    const user = userEvent.setup();
    renderSettings();
    await screen.findByRole('heading', { name: '設定' });

    expect(screen.getByText('このブラウザでは利用できません')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '更新を確認する' }));
    expect(
      await screen.findByText(
        'このブラウザはService Workerに対応していないため、更新を確認できません。',
      ),
    ).toBeInTheDocument();
  });

  it('registration.update()が成功し更新がなければ最新のバージョンと表示する', async () => {
    enableServiceWorkerSupport();
    const user = userEvent.setup();
    const update = vi.fn(() => Promise.resolve(undefined));
    renderSettings();
    await screen.findByRole('heading', { name: '設定' });
    registerServiceWorker(createRegistration(update));

    await user.click(screen.getByRole('button', { name: '更新を確認する' }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(screen.getByText('現在のバージョンが最新です。')).toBeInTheDocument();
    expect(pwaRegisterMock.updateServiceWorker).not.toHaveBeenCalled();
  });

  it('registration.update()のsw.js取得失敗を利用者向けに区別して表示する', async () => {
    enableServiceWorkerSupport();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const user = userEvent.setup();
    const update = vi.fn(() => Promise.reject(new TypeError('Failed to fetch /sw.js')));
    renderSettings();
    await screen.findByRole('heading', { name: '設定' });
    registerServiceWorker(createRegistration(update));

    await user.click(screen.getByRole('button', { name: '更新を確認する' }));

    expect(
      await screen.findByText(
        '更新用のService Worker（sw.js）を取得できませんでした。接続を確認してから再試行してください。',
      ),
    ).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('TypeError: Failed to fetch /sw.js'),
      expect.any(TypeError),
    );
    expect(pwaRegisterMock.updateServiceWorker).not.toHaveBeenCalled();
  });

  it('registration.update()のその他の失敗は更新確認エラーとして表示する', async () => {
    enableServiceWorkerSupport();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const user = userEvent.setup();
    const update = vi.fn(() => Promise.reject(new Error('registration update rejected')));
    renderSettings();
    await screen.findByRole('heading', { name: '設定' });
    registerServiceWorker(createRegistration(update));

    await user.click(screen.getByRole('button', { name: '更新を確認する' }));

    expect(
      await screen.findByText('更新の確認に失敗しました。時間をおいてもう一度お試しください。'),
    ).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('Error: registration update rejected'),
      expect.any(Error),
    );
  });

  it('Service Workerが未登録の場合は理由を表示して更新確認を行わない', async () => {
    enableServiceWorkerSupport();
    const user = userEvent.setup();
    renderSettings();
    await screen.findByRole('heading', { name: '設定' });
    registerServiceWorker(undefined);

    expect(screen.getByText('Service Workerが未登録です')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '更新を確認する' }));
    expect(
      await screen.findByText(
        'Service Workerが登録されていないため、更新を確認できません。再読み込みしてください。',
      ),
    ).toBeInTheDocument();
  });

  it('オフライン時はregistration.update()を呼ばずに理由を表示する', async () => {
    enableServiceWorkerSupport();
    setOnline(false);
    const user = userEvent.setup();
    const update = vi.fn(() => Promise.resolve(undefined));
    renderSettings();
    await screen.findByRole('heading', { name: '設定' });
    registerServiceWorker(createRegistration(update));

    await user.click(screen.getByRole('button', { name: '更新を確認する' }));

    expect(
      await screen.findByText(
        'オフラインのため更新を確認できません。接続を確認してから再試行してください。',
      ),
    ).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
  });

  it('package.jsonのバージョンを設定画面へ一元表示する', async () => {
    enableServiceWorkerSupport();
    renderSettings();
    await screen.findByRole('heading', { name: '設定' });

    expect(screen.getAllByText(packageMetadata.version, { exact: true })).toHaveLength(2);
  });
});
