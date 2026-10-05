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

type ServiceWorkerStatus =
  'preparing' | 'ready' | 'unsupported' | 'unregistered' | 'registration_error';
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
  isCheckingForUpdate: boolean;
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
const OFFLINE_READY_NOTICE_KEY = 'sc-dojo:pwa-offline-ready-notified';
const INSTALL_SUGGESTION_DISMISSED_KEY = 'sc-dojo:pwa-install-suggestion-dismissed';

export function PwaProvider({ children }: PropsWithChildren) {
  const registrationRef = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const needsUpdateRef = useRef(false);
  const updateCheckInFlightRef = useRef(false);
  const updateApplyInFlightRef = useRef(false);
  const deferredInstallPrompt = useRef<BeforeInstallPromptEvent | undefined>(undefined);
  const [isOnline, setIsOnline] = useState(getOnlineState);
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState<ServiceWorkerStatus>(
    isServiceWorkerSupported() ? 'preparing' : 'unsupported',
  );
  const [serviceWorkerError, setServiceWorkerError] = useState<string>();
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [isOfflineReadyNoticeVisible, setIsOfflineReadyNoticeVisible] = useState(false);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [isUpdateDismissed, setIsUpdateDismissed] = useState(false);
  const [isCheckingForUpdate, setIsCheckingForUpdate] = useState(false);
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

  const markUpdateAvailable = useCallback(() => {
    needsUpdateRef.current = true;
    setNeedsUpdate(true);
    setIsUpdateDismissed(false);
    setUpdateError(undefined);
    setUpdateCheckMessage(undefined);
  }, []);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onNeedRefresh() {
      markUpdateAvailable();
    },
    onOfflineReady: markOfflineReady,
    onRegisteredSW(_scriptUrl, registration) {
      registrationRef.current = registration;
      if (registration === undefined) {
        setServiceWorkerStatus('unregistered');
        setServiceWorkerError(
          'Service Workerが登録されていません。オンラインで再読み込みして、オフライン準備を完了してください。',
        );
        return;
      }

      setServiceWorkerStatus('ready');
      setServiceWorkerError(undefined);
      if (registration.waiting !== null) {
        markUpdateAvailable();
      }
      const ready = navigator.serviceWorker?.ready;
      if (ready !== undefined) {
        void ready.then(markOfflineReady).catch((error: unknown) => {
          logPwaError('Service Worker ready check failed', error);
        });
      }
    },
    onRegisterError(error: unknown) {
      registrationRef.current = undefined;
      setServiceWorkerStatus('registration_error');
      setServiceWorkerError(
        'Service Workerを登録できませんでした。オンラインで再読み込みして、もう一度お試しください。',
      );
      logPwaError('Service Worker registration failed', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      markUpdateAvailable();
    }
  }, [markUpdateAvailable, needRefresh]);

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
    if (updateApplyInFlightRef.current || isUpdating) {
      return;
    }
    const registration = registrationRef.current;
    if (!isServiceWorkerSupported()) {
      const message = 'このブラウザはService Workerに対応していないため、更新を適用できません。';
      setUpdateError(message);
      throw new PwaUpdateError('unsupported', message);
    }
    if (registration === undefined) {
      const message =
        'Service Workerが登録されていないため、更新を適用できません。再読み込みしてください。';
      setServiceWorkerStatus('unregistered');
      setUpdateError(message);
      throw new PwaUpdateError('unregistered', message);
    }
    if (!isNavigatorOnline()) {
      const message =
        'オフラインのため更新を適用できません。接続を確認してから再試行してください。';
      setUpdateError(message);
      throw new PwaUpdateError('offline', message);
    }
    if (!needsUpdateRef.current && registration.waiting === null) {
      setUpdateError(undefined);
      setUpdateCheckMessage('現在のバージョンが最新です。');
      return;
    }
    if (dataOperationCount > 0) {
      const message = '復元または全消去の処理中です。完了してから更新してください。';
      setUpdateError(message);
      throw new PwaUpdateError('data_operation', message);
    }
    if (persistenceFailure !== undefined) {
      const message =
        '学習状態を保存できていません。画面の案内に従って保存を完了してから更新してください。';
      setUpdateError(message);
      throw new PwaUpdateError('persistence', message);
    }

    updateApplyInFlightRef.current = true;
    setIsUpdating(true);
    setUpdateError(undefined);
    let learningStateSaved = false;
    try {
      await confirmLearningStateSaved();
      learningStateSaved = true;
      await updateServiceWorker(true);
      needsUpdateRef.current = false;
      setNeedsUpdate(false);
    } catch (error) {
      logPwaError('Service Worker update apply failed', error);
      const message = !learningStateSaved
        ? '学習状態を保存できなかったため、更新を適用していません。保存状態を確認してから再試行してください。'
        : '更新を適用できませんでした。接続状態を確認して、もう一度お試しください。';
      setUpdateError(message);
      throw new PwaUpdateError('apply_failed', message);
    } finally {
      updateApplyInFlightRef.current = false;
      setIsUpdating(false);
    }
  }, [dataOperationCount, isUpdating, persistenceFailure, updateServiceWorker]);

  const checkForUpdate = useCallback(async () => {
    if (updateCheckInFlightRef.current || isCheckingForUpdate) {
      return;
    }
    if (!isServiceWorkerSupported()) {
      const message = 'このブラウザはService Workerに対応していないため、更新を確認できません。';
      setUpdateError(message);
      throw new PwaUpdateError('unsupported', message);
    }
    if (!isNavigatorOnline()) {
      const message =
        'オフラインのため更新を確認できません。接続を確認してから再試行してください。';
      setUpdateError(message);
      throw new PwaUpdateError('offline', message);
    }
    if (dataOperationCount > 0) {
      const message = '復元または全消去の処理中は、更新を確認できません。';
      setUpdateError(message);
      throw new PwaUpdateError('data_operation', message);
    }
    const registration = registrationRef.current;
    if (registration === undefined) {
      const message =
        'Service Workerが登録されていないため、更新を確認できません。再読み込みしてください。';
      setServiceWorkerStatus('unregistered');
      setUpdateError(message);
      throw new PwaUpdateError('unregistered', message);
    }

    updateCheckInFlightRef.current = true;
    setIsCheckingForUpdate(true);
    setUpdateError(undefined);
    setUpdateCheckMessage(undefined);
    try {
      await registration.update();
      await Promise.resolve();
      if (needsUpdateRef.current || registration.waiting !== null) {
        markUpdateAvailable();
        return;
      }
      setUpdateCheckMessage('現在のバージョンが最新です。');
    } catch (error) {
      logPwaError('Service Worker update check failed', error);
      const message = isServiceWorkerScriptFetchError(error)
        ? '更新用のService Worker（sw.js）を取得できませんでした。接続を確認してから再試行してください。'
        : '更新の確認に失敗しました。時間をおいてもう一度お試しください。';
      setUpdateError(message);
      throw new PwaUpdateError(
        isServiceWorkerScriptFetchError(error) ? 'script_fetch_failed' : 'check_failed',
        message,
      );
    } finally {
      updateCheckInFlightRef.current = false;
      setIsCheckingForUpdate(false);
    }
  }, [dataOperationCount, isCheckingForUpdate, markUpdateAvailable]);

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
      isCheckingForUpdate,
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
      isCheckingForUpdate,
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
  constructor(
    readonly kind:
      | 'unsupported'
      | 'unregistered'
      | 'offline'
      | 'data_operation'
      | 'persistence'
      | 'script_fetch_failed'
      | 'check_failed'
      | 'apply_failed',
    message: string,
  ) {
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
    [
      database.practiceSessions,
      database.examSessions,
      database.b1PracticeSessions,
      database.b1MockSessions,
      database.settings,
    ],
    async () => {
      await Promise.all([
        database.practiceSessions.where('status').equals('in_progress').first(),
        database.examSessions.where('status').equals('in_progress').first(),
        database.b1PracticeSessions.where('status').equals('in_progress').first(),
        database.b1MockSessions.where('status').equals('in_progress').first(),
        database.settings.get('appearance'),
      ]);
    },
  );
}

function isNavigatorOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine;
}

function isServiceWorkerScriptFetchError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return /sw\.js|service\s*worker|failed to fetch|network/i.test(error.message);
}

function logPwaError(operation: string, error: unknown): void {
  if (error instanceof Error) {
    console.error(`[PWA] ${operation}: ${error.name}: ${error.message}`, error);
    return;
  }
  console.error(`[PWA] ${operation}:`, error);
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
