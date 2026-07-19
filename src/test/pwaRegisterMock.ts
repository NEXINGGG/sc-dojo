import { vi } from 'vitest';

export interface PwaRegisterOptions {
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegisteredSW?: (scriptUrl: string, registration: ServiceWorkerRegistration | undefined) => void;
  onRegisterError?: (error: unknown) => void;
}

export const pwaRegisterMock = {
  options: undefined as PwaRegisterOptions | undefined,
  updateServiceWorker: vi.fn<(reloadPage?: boolean) => Promise<void>>(),
};

export function resetPwaRegisterMock(): void {
  pwaRegisterMock.options = undefined;
  pwaRegisterMock.updateServiceWorker.mockReset();
  pwaRegisterMock.updateServiceWorker.mockResolvedValue(undefined);
}

export function useRegisterSW(options?: PwaRegisterOptions) {
  pwaRegisterMock.options = options;
  return {
    needRefresh: [false, () => undefined] as const,
    offlineReady: [false, () => undefined] as const,
    updateServiceWorker: pwaRegisterMock.updateServiceWorker,
  };
}
