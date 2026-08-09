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
import { database } from '../../database/database';
import { useAuth } from '../auth/AuthContext';
import { supabaseClient } from '../auth/supabaseClient';
import {
  CloudSyncLocalRepository,
  CloudSyncUserMismatchError,
  type CloudSyncPendingSummary,
} from './cloudSyncLocalRepository';
import {
  CloudSyncService,
  type CloudSyncCountsBySubject,
  type CloudSyncResult,
} from './cloudSyncService';
import { subscribeToCloudSyncNeeded } from './syncEvents';
import { SupabaseCloudSyncGateway } from './supabaseCloudSyncGateway';
import { CloudSyncGatewayError } from './types';

export type CloudSyncStatus = 'idle' | 'syncing' | 'success' | 'partial' | 'error';
export type CloudSyncErrorKind = 'offline' | 'user_switch' | 'auth' | 'permanent' | 'general';

interface CloudSyncContextValue {
  status: CloudSyncStatus;
  isOnline: boolean;
  error?: string;
  errorKind?: CloudSyncErrorKind;
  lastSuccessfulSyncAt?: string;
  lastSyncCounts?: {
    uploaded: number;
    downloaded: number;
    bySubject: CloudSyncCountsBySubject;
  };
  pending: CloudSyncPendingSummary;
  requestSync: () => Promise<void>;
  clearSyncError: () => void;
}

const CloudSyncContext = createContext<CloudSyncContextValue | undefined>(undefined);

const defaultService =
  supabaseClient === undefined
    ? undefined
    : new CloudSyncService(
        new CloudSyncLocalRepository(database),
        new SupabaseCloudSyncGateway(supabaseClient),
      );

export function CloudSyncProvider({
  children,
  service = defaultService,
}: PropsWithChildren<{ service?: CloudSyncService }>) {
  const { user, isLoading } = useAuth();
  const userId = user?.id;
  const [status, setStatus] = useState<CloudSyncStatus>('idle');
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator === 'undefined' || navigator.onLine,
  );
  const [error, setError] = useState<string>();
  const [errorKind, setErrorKind] = useState<CloudSyncErrorKind>();
  const [lastSuccessfulSyncAt, setLastSuccessfulSyncAt] = useState<string>();
  const [lastSyncCounts, setLastSyncCounts] = useState<{
    uploaded: number;
    downloaded: number;
    bySubject: CloudSyncCountsBySubject;
  }>();
  const [pending, setPending] = useState<CloudSyncPendingSummary>(createEmptyPendingSummary);
  const inFlightRef = useRef<Promise<CloudSyncResult> | undefined>(undefined);
  const rerunRequestedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const activeUserIdRef = useRef<string | undefined>(undefined);
  activeUserIdRef.current = userId;

  const refreshPending = useCallback(
    async (requestedUserId: string): Promise<CloudSyncPendingSummary> => {
      const next =
        service === undefined
          ? createEmptyPendingSummary()
          : await service.getPendingSummary(requestedUserId);
      if (activeUserIdRef.current === requestedUserId) setPending(next);
      return next;
    },
    [service],
  );

  useEffect(() => {
    if (service === undefined || userId === undefined) {
      setLastSuccessfulSyncAt(undefined);
      setLastSyncCounts(undefined);
      setPending(createEmptyPendingSummary());
      return;
    }
    let isCurrent = true;
    void Promise.all([service.getState(), service.getPendingSummary(userId)]).then(
      ([state, pendingSummary]) => {
        if (!isCurrent || activeUserIdRef.current !== userId) return;
        if (state?.ownerUserId === userId) {
          setLastSuccessfulSyncAt(state.lastSuccessfulSyncAt);
        }
        setPending(pendingSummary);
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [service, userId]);

  useEffect(() => {
    if (service === undefined || userId === undefined) return;
    return () => {
      service.deactivateUser(userId);
      if (activeUserIdRef.current === userId) activeUserIdRef.current = undefined;
    };
  }, [service, userId]);

  const runSync = useCallback(
    async (manual: boolean): Promise<void> => {
      if (service === undefined || userId === undefined || isLoading) return;
      if (inFlightRef.current !== undefined) {
        rerunRequestedRef.current = true;
        await inFlightRef.current.catch(() => undefined);
        return;
      }

      const requestedUserId = userId;
      let shouldRunAgain: boolean;
      let force = manual;
      do {
        shouldRunAgain = false;
        rerunRequestedRef.current = false;
        setStatus('syncing');
        setError(undefined);
        setErrorKind(undefined);
        const synchronization = service.synchronize({
          userId: requestedUserId,
          isOnline: typeof navigator === 'undefined' || navigator.onLine,
          force,
        });
        force = false;
        inFlightRef.current = synchronization;
        let synchronized = false;
        try {
          const result = await synchronization;
          if (activeUserIdRef.current !== requestedUserId) return;
          if (result.status === 'skipped_offline') {
            await refreshPending(requestedUserId);
            if (manual) {
              setStatus('error');
              setErrorKind('offline');
              setError('オフラインです。学習内容はこの端末に保存されています。');
            } else {
              setStatus('idle');
            }
          } else if (result.status === 'deferred') {
            const nextPending = await refreshPending(requestedUserId);
            applyDeferredStatus(nextPending, setStatus, setErrorKind, setError);
          } else if (result.status === 'synchronized') {
            if (result.completedAt !== undefined) {
              setLastSuccessfulSyncAt(result.completedAt);
            }
            setLastSyncCounts({
              uploaded: result.uploadedCount,
              downloaded: result.downloadedCount,
              bySubject: result.countsBySubject,
            });
            setPending(result.pending);
            if (result.pending.failed > 0) {
              setStatus('partial');
              applyPendingFailureMessage(result.pending, setErrorKind, setError);
            } else {
              setStatus('success');
            }
            synchronized = true;
          }
        } catch (syncError) {
          if (activeUserIdRef.current !== requestedUserId) return;
          const nextPending = await refreshPending(requestedUserId);
          setStatus('error');
          if (syncError instanceof CloudSyncUserMismatchError) {
            setErrorKind('user_switch');
            setError(
              'この端末には別のGoogleアカウントで同期した学習データがあります。データ混在を防ぐため同期を停止しました。',
            );
          } else if (syncError instanceof CloudSyncGatewayError && syncError.kind === 'auth') {
            setErrorKind('auth');
            setError('クラウド同期には再ログインが必要です。');
          } else if (syncError instanceof CloudSyncGatewayError && syncError.kind === 'permanent') {
            setErrorKind('permanent');
            setError(
              '同期データの形式を確認できませんでした。再試行しても解決しない場合は更新をお待ちください。',
            );
          } else {
            setErrorKind('general');
            setError(
              nextPending.pending > 0
                ? `今回は同期できませんでした。未同期 ${nextPending.pending}件はこの端末に保存され、後で自動再試行します。`
                : 'クラウド同期に失敗しました。接続を確認して、もう一度お試しください。',
            );
          }
        } finally {
          if (inFlightRef.current === synchronization) {
            inFlightRef.current = undefined;
          }
        }
        shouldRunAgain =
          synchronized && rerunRequestedRef.current && activeUserIdRef.current === requestedUserId;
      } while (shouldRunAgain);
    },
    [isLoading, refreshPending, service, userId],
  );

  useEffect(() => {
    if (userId === undefined) {
      setStatus('idle');
      setError(undefined);
      setErrorKind(undefined);
      return;
    }
    void runSync(false);
  }, [runSync, userId]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void runSync(false);
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [runSync]);

  useEffect(() => {
    const unsubscribe = subscribeToCloudSyncNeeded(({ debounceMs = 750 }) => {
      if (userId !== undefined) void refreshPending(userId);
      if (debounceRef.current !== undefined) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => void runSync(false), debounceMs);
    });
    return () => {
      unsubscribe();
      if (debounceRef.current !== undefined) {
        clearTimeout(debounceRef.current);
        debounceRef.current = undefined;
      }
    };
  }, [refreshPending, runSync, userId]);

  useEffect(() => {
    if (
      userId === undefined ||
      !isOnline ||
      pending.nextRetryAt === undefined ||
      pending.authFailed > 0 ||
      pending.permanentFailed > 0
    ) {
      return;
    }
    const delay = Math.max(0, new Date(pending.nextRetryAt).getTime() - Date.now());
    const retryTimer = setTimeout(() => void runSync(false), delay);
    return () => clearTimeout(retryTimer);
  }, [isOnline, pending, runSync, userId]);

  const value = useMemo<CloudSyncContextValue>(
    () => ({
      status,
      isOnline,
      error,
      errorKind,
      lastSuccessfulSyncAt,
      lastSyncCounts,
      pending,
      requestSync: () => runSync(true),
      clearSyncError: () => {
        setStatus('idle');
        setError(undefined);
        setErrorKind(undefined);
      },
    }),
    [error, errorKind, isOnline, lastSuccessfulSyncAt, lastSyncCounts, pending, runSync, status],
  );

  return <CloudSyncContext.Provider value={value}>{children}</CloudSyncContext.Provider>;
}

function createEmptyPendingSummary(): CloudSyncPendingSummary {
  return {
    pending: 0,
    failed: 0,
    authFailed: 0,
    permanentFailed: 0,
    bySubject: { A1: 0, A2: 0, B1: 0 },
  };
}

function applyDeferredStatus(
  pending: CloudSyncPendingSummary,
  setStatus: (value: CloudSyncStatus) => void,
  setErrorKind: (value: CloudSyncErrorKind | undefined) => void,
  setError: (value: string | undefined) => void,
) {
  if (pending.authFailed > 0 || pending.permanentFailed > 0) {
    setStatus('partial');
    applyPendingFailureMessage(pending, setErrorKind, setError);
  } else {
    setStatus('idle');
  }
}

function applyPendingFailureMessage(
  pending: CloudSyncPendingSummary,
  setErrorKind: (value: CloudSyncErrorKind | undefined) => void,
  setError: (value: string | undefined) => void,
) {
  if (pending.authFailed > 0) {
    setErrorKind('auth');
    setError('クラウド同期には再ログインが必要です。');
  } else if (pending.permanentFailed > 0) {
    setErrorKind('permanent');
    setError(`${pending.pending}件中${pending.failed}件を同期できませんでした。`);
  } else {
    setErrorKind('general');
    setError(`${pending.pending}件中${pending.failed}件を同期できませんでした。`);
  }
}

// The hook intentionally shares the provider state managed in this module.
// eslint-disable-next-line react-refresh/only-export-components
export function useCloudSync(): CloudSyncContextValue {
  const context = useContext(CloudSyncContext);
  if (context === undefined) {
    throw new Error('クラウド同期情報はCloudSyncProviderの配下で利用してください。');
  }
  return context;
}
