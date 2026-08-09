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
import { CloudSyncLocalRepository, CloudSyncUserMismatchError } from './cloudSyncLocalRepository';
import { CloudSyncService, type CloudSyncResult } from './cloudSyncService';
import { subscribeToCloudSyncNeeded } from './syncEvents';
import { SupabaseCloudSyncGateway } from './supabaseCloudSyncGateway';

export type CloudSyncStatus = 'idle' | 'syncing' | 'success' | 'error';
export type CloudSyncErrorKind = 'offline' | 'user_switch' | 'general';

interface CloudSyncContextValue {
  status: CloudSyncStatus;
  error?: string;
  errorKind?: CloudSyncErrorKind;
  lastSuccessfulSyncAt?: string;
  lastSyncCounts?: { uploaded: number; downloaded: number };
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
  const [status, setStatus] = useState<CloudSyncStatus>('idle');
  const [error, setError] = useState<string>();
  const [errorKind, setErrorKind] = useState<CloudSyncErrorKind>();
  const [lastSuccessfulSyncAt, setLastSuccessfulSyncAt] = useState<string>();
  const [lastSyncCounts, setLastSyncCounts] = useState<{
    uploaded: number;
    downloaded: number;
  }>();
  const inFlightRef = useRef<Promise<CloudSyncResult> | undefined>(undefined);
  const rerunRequestedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const activeUserIdRef = useRef<string | undefined>(undefined);
  activeUserIdRef.current = user?.id;

  useEffect(() => {
    if (service === undefined || user === undefined) {
      setLastSuccessfulSyncAt(undefined);
      setLastSyncCounts(undefined);
      return;
    }
    let isCurrent = true;
    void service.getState().then((state) => {
      if (isCurrent && state?.ownerUserId === user.id) {
        setLastSuccessfulSyncAt(state.lastSuccessfulSyncAt);
      }
    });
    return () => {
      isCurrent = false;
    };
  }, [service, user]);

  const runSync = useCallback(
    async (manual: boolean): Promise<void> => {
      if (service === undefined || user === undefined || isLoading) return;
      if (inFlightRef.current !== undefined) {
        rerunRequestedRef.current = true;
        await inFlightRef.current;
        return;
      }

      const isOnline = typeof navigator === 'undefined' || navigator.onLine;
      if (!isOnline) {
        if (manual) {
          setStatus('error');
          setErrorKind('offline');
          setError('オフラインのため同期できません。接続後にもう一度お試しください。');
        }
        return;
      }

      const userId = user.id;
      let shouldRunAgain: boolean;
      do {
        shouldRunAgain = false;
        rerunRequestedRef.current = false;
        setStatus('syncing');
        setError(undefined);
        setErrorKind(undefined);
        const synchronization = service.synchronize({ userId, isOnline: true });
        inFlightRef.current = synchronization;
        let succeeded = false;
        try {
          const result = await synchronization;
          if (activeUserIdRef.current !== userId) return;
          if (result.status === 'synchronized') {
            setLastSuccessfulSyncAt(result.completedAt);
            setLastSyncCounts({
              uploaded: result.uploadedCount,
              downloaded: result.downloadedCount,
            });
            setStatus('success');
            succeeded = true;
          }
        } catch (syncError) {
          if (activeUserIdRef.current !== userId) return;
          setStatus('error');
          if (syncError instanceof CloudSyncUserMismatchError) {
            setErrorKind('user_switch');
            setError(
              'この端末には別のGoogleアカウントで同期した学習データがあります。データ混在を防ぐため同期を停止しました。',
            );
          } else {
            setErrorKind('general');
            setError('クラウド同期に失敗しました。接続を確認して、もう一度お試しください。');
          }
        } finally {
          if (inFlightRef.current === synchronization) {
            inFlightRef.current = undefined;
          }
        }
        shouldRunAgain =
          succeeded && rerunRequestedRef.current && activeUserIdRef.current === userId;
      } while (shouldRunAgain);
    },
    [isLoading, service, user],
  );

  useEffect(() => {
    if (user === undefined) {
      setStatus('idle');
      setError(undefined);
      setErrorKind(undefined);
      return;
    }
    void runSync(false);
  }, [runSync, user]);

  useEffect(() => {
    const handleOnline = () => void runSync(false);
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [runSync]);

  useEffect(() => {
    const unsubscribe = subscribeToCloudSyncNeeded(({ debounceMs = 750 }) => {
      if (debounceRef.current !== undefined) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => void runSync(false), debounceMs);
    });
    return () => {
      unsubscribe();
      if (debounceRef.current !== undefined) {
        clearTimeout(debounceRef.current);
        debounceRef.current = undefined;
      }
    };
  }, [runSync]);

  const value = useMemo<CloudSyncContextValue>(
    () => ({
      status,
      error,
      errorKind,
      lastSuccessfulSyncAt,
      lastSyncCounts,
      requestSync: () => runSync(true),
      clearSyncError: () => {
        setStatus('idle');
        setError(undefined);
        setErrorKind(undefined);
      },
    }),
    [error, errorKind, lastSuccessfulSyncAt, lastSyncCounts, runSync, status],
  );

  return <CloudSyncContext.Provider value={value}>{children}</CloudSyncContext.Provider>;
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
