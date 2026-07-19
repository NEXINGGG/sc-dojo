import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { APP_VERSION } from '../../app/appVersion';
import { database } from '../../database/database';

type ServiceWorkerStatus = 'preparing' | 'ready' | 'unavailable' | 'error';
type InstallOutcome = 'accepted' | 'dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: InstallOutcome; platform: string }>;
}

interface PwaContextValue {
  appVersion: string;
  isOnline: boolean;
  isOfflineReady: boolean;
  isOfflineReadyNoticeVisible: boolean;
  serviceWorkerStatus: ServiceWorkerStatus;
  serviceWorkerError?: string;
  needsUpdate: boolean;
  isUpdateDismissed: boolean;
  isUpdating: boolean;
  updateError?: string;
  updateCheckMessage?: string;
  isDataOperationInProgress: boolean;
  hasUnsavedState: boolean;
  canPromptInstall: boolean;
  isInstalling: boolean;
  isInstalled: boolean;
  isIos: boolean;
  isIosSafari: boolean;
  requestUpdate: () => Promise<void>;
  checkForUpdate: () => Promise<void>;
  dismissUpdate: () => void;
  showUpdateNotice: () => void;
  dismissOfflineReadyNotice: () => void;
  requestInstall: () => Promise<void>;
  dismissInstallSuggestion: () => void;
  runDataOperation: <T>(operation: () => Promise<T>) => Promise<T>;
  reportPersistenceFailure: (message: string) => void;
  confirmPersistenceSaved: () => void;
}

const PwaContext = createContext<PwaContextValue | undefined>(undefined);
const OFFLINE_READY_NOTICE_KEY = 'a1-dojo:pwa-offline-ready-notified';
const INSTALL_SUGGESTION_DISMISSED_KEY = 'a1-dojo:pwa-install-suggestion-dismissed';

export function PwaProvider({ children }: PropsWithChildren) {
  const registrationRef = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const deferredInstallPrompt = useRef<BeforeInstallPromptEvent | undefined>(undefined);
  const [isOnline, setIsOnline] = useState(getOnlineState);
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState<ServiceWorkerStatus>(
    isServiceWorkerSupported() ? 'preparing' : 'unavailable',
  );
  const [serviceWorkerError, setServiceWorkerError] = useState<string>();
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [isOfflineReadyNoticeVisible, setIsOfflineReadyNoticeVisible] = useState(false);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [isUpdateDismissed, setIsUpdateDismissed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string>();
  const [updateCheckMessage, setUpdateCheckMessage] = useState<string>();
  const [dataOperationCount, setDataOperationCount] = useState(0);
  const [persistenceFailure, setPersistenceFailure] = useState<string>();
  const [installPromptAvailable, setInstallPromptAvailable] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(getStandaloneState);
  const [isInstallSuggestionDismissed, setIsInstallSuggestionDismissed] = useState(() =>
    readStorageFlag(INSTALL_SUGGESTION_DISMISSED_KEY),
  );
  const isIos = getIsIos();
  const isIosSafari = isIos && getIsIosSafari();

  const markOfflineReady = useCallback(() => {
    setIsOfflineReady(true);
    setServiceWorkerStatus('ready');
    if (!readStorageFlag(OFFLINE_READY_NOTICE_KEY)) {
      writeStorageFlag(OFFLINE_READY_NOTICE_KEY);
      setIsOfflineReadyNoticeVisible(true);
    }
  }, []);

  const { updateServiceWorker } = useRegisterSW({
    onNeedRefresh() {
      setNeedsUpdate(true);
      setIsUpdateDismissed(false);
      setUpdateError(undefined);
      setUpdateCheckMessage(undefined);
    },
    onOfflineReady: markOfflineReady,
    onRegisteredSW(_scriptUrl, registration) {
      registrationRef.current = registration;
      if (registration !== undefined) {
        setServiceWorkerStatus('ready');
        void navigator.serviceWorker?.ready.then(markOfflineReady).catch(() => {
          // 登録済みでもキャッシュの確認に失敗した場合は、通常のWebアプリとして継続する。
        });
      }
    },
    onRegisterError() {
      setServiceWorkerStatus('error');
      setServiceWorkerError(
        'オフライン準備を完了できませんでした。オンライン接続中は通常どおり利用できます。',
      );
    },
  });

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    const receiveInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredInstallPrompt.current = event as BeforeInstallPromptEvent;
      setInstallPromptAvailable(true);
    };
    const installed = () => {
      deferredInstallPrompt.current = undefined;
      setInstallPromptAvailable(false);
      setIsInstalled(true);
      setIsInstallSuggestionDismissed(true);
      writeStorageFlag(INSTALL_SUGGESTION_DISMISSED_KEY);
    };
    window.addEventListener('beforeinstallprompt', receiveInstallPrompt);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('beforeinstallprompt', receiveInstallPrompt);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  useEffect(() => {
    if (!isOfflineReadyNoticeVisible) {
      return;
    }
    const timeoutId = window.setTimeout(() => setIsOfflineReadyNoticeVisible(false), 6_000);
    return () => window.clearTimeout(timeoutId);
  }, [isOfflineReadyNoticeVisible]);

  const runDataOperation = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    setDataOperationCount((count) => count + 1);
    try {
      return await operation();
    } finally {
      setDataOperationCount((count) => Math.max(0, count - 1));
    }
  }, []);

  const reportPersistenceFailure = useCallback((message: string) => {
    setPersistenceFailure(message);
  }, []);

  const confirmPersistenceSaved = useCallback(() => {
    setPersistenceFailure(undefined);
  }, []);

  const requestUpdate = useCallback(async () => {
    if (!needsUpdate || isUpdating) {
      return;
    }
    if (dataOperationCount > 0) {
      const message = '復元または全消去の処理中です。完了してから更新してください。';
      setUpdateError(message);
      throw new PwaUpdateError(message);
    }
    if (persistenceFailure !== undefined) {
      const message =
        '学習状態を保存できていません。画面の案内に従って保存を完了してから更新してください。';
      setUpdateError(message);
      throw new PwaUpdateError(message);
    }

    setIsUpdating(true);
    setUpdateError(undefined);
    try {
      await confirmLearningStateSaved();
      await updateServiceWorker(true);
      setNeedsUpdate(false);
    } catch {
      const message = '更新を適用できませんでした。通信状態を確認して、もう一度お試しください。';
      setUpdateError(message);
      throw new PwaUpdateError(message);
    } finally {
      setIsUpdating(false);
    }
  }, [dataOperationCount, isUpdating, needsUpdate, persistenceFailure, updateServiceWorker]);

  const checkForUpdate = useCallback(async () => {
    if (dataOperationCount > 0) {
      const message = '復元または全消去の処理中は、更新を確認できません。';
      setUpdateError(message);
      throw new PwaUpdateError(message);
    }
    const registration = registrationRef.current;
    if (registration === undefined) {
      setUpdateCheckMessage('更新の確認は、オフライン準備が完了してから利用できます。');
      return;
    }
    setUpdateError(undefined);
    setUpdateCheckMessage(undefined);
    try {
      await registration.update();
      setUpdateCheckMessage('更新を確認しました。新しいバージョンがあればお知らせします。');
    } catch {
      const message =
        '更新を確認できませんでした。オンライン接続を確認して、もう一度お試しください。';
      setUpdateError(message);
      throw new PwaUpdateError(message);
    }
  }, [dataOperationCount]);

  const requestInstall = useCallback(async () => {
    const prompt = deferredInstallPrompt.current;
    if (prompt === undefined || isInstalled || isInstalling) {
      return;
    }
    setIsInstalling(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      if (choice.outcome === 'dismissed') {
        setIsInstallSuggestionDismissed(true);
        writeStorageFlag(INSTALL_SUGGESTION_DISMISSED_KEY);
      }
      deferredInstallPrompt.current = undefined;
      setInstallPromptAvailable(false);
    } finally {
      setIsInstalling(false);
    }
  }, [isInstalled, isInstalling]);

  const value = useMemo<PwaContextValue>(
    () => ({
      appVersion: APP_VERSION,
      isOnline,
      isOfflineReady,
      isOfflineReadyNoticeVisible,
      serviceWorkerStatus,
      serviceWorkerError,
      needsUpdate,
      isUpdateDismissed,
      isUpdating,
      updateError,
      updateCheckMessage,
      isDataOperationInProgress: dataOperationCount > 0,
      hasUnsavedState: persistenceFailure !== undefined,
      canPromptInstall: installPromptAvailable && !isInstalled && !isInstallSuggestionDismissed,
      isInstalling,
      isInstalled,
      isIos,
      isIosSafari,
      requestUpdate,
      checkForUpdate,
      dismissUpdate: () => setIsUpdateDismissed(true),
      showUpdateNotice: () => setIsUpdateDismissed(false),
      dismissOfflineReadyNotice: () => setIsOfflineReadyNoticeVisible(false),
      requestInstall,
      dismissInstallSuggestion: () => {
        setIsInstallSuggestionDismissed(true);
        writeStorageFlag(INSTALL_SUGGESTION_DISMISSED_KEY);
      },
      runDataOperation,
      reportPersistenceFailure,
      confirmPersistenceSaved,
    }),
    [
      checkForUpdate,
      dataOperationCount,
      installPromptAvailable,
      isInstallSuggestionDismissed,
      isInstalled,
      isInstalling,
      isOfflineReady,
      isOfflineReadyNoticeVisible,
      isOnline,
      isIos,
      isIosSafari,
      isUpdateDismissed,
      isUpdating,
      needsUpdate,
      persistenceFailure,
      requestInstall,
      requestUpdate,
      reportPersistenceFailure,
      runDataOperation,
      serviceWorkerError,
      serviceWorkerStatus,
      updateCheckMessage,
      updateError,
      confirmPersistenceSaved,
    ],
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export class PwaUpdateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PwaUpdateError';
  }
}

// Context用hookを同じファイルに置き、Providerとの型と状態を一貫させます。
// eslint-disable-next-line react-refresh/only-export-components
export function usePwa(): PwaContextValue {
  const context = useContext(PwaContext);
  if (context === undefined) {
    throw new Error('PWA設定はPwaProviderの配下で利用してください。');
  }
  return context;
}

async function confirmLearningStateSaved(): Promise<void> {
  await database.open();
  await database.transaction(
    'rw',
    [database.practiceSessions, database.examSessions, database.settings],
    async () => {
      await Promise.all([
        database.practiceSessions.where('status').equals('in_progress').first(),
        database.examSessions.where('status').equals('in_progress').first(),
        database.settings.get('appearance'),
      ]);
    },
  );
}

function getOnlineState(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine;
}

function isServiceWorkerSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

function getStandaloneState(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  const iosNavigator = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    iosNavigator.standalone === true
  );
}

function getIsIos(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function getIsIosSafari(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return (
    /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent)
  );
}

function readStorageFlag(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeStorageFlag(key: string): void {
  try {
    window.localStorage.setItem(key, '1');
  } catch {
    // 保存できない場合でも、その場の通知を閉じることはできます。
  }
}
