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
import type { User } from '@supabase/supabase-js';
import { authConfiguration, supabaseClient } from './supabaseClient';
import { cleanupOAuthCodeFromUrl } from './authUrl';

interface AuthContextValue {
  user?: User;
  isConfigured: boolean;
  isLoading: boolean;
  isActionInProgress: boolean;
  error?: string;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User>();
  const [isLoading, setIsLoading] = useState(authConfiguration.isConfigured);
  const [isActionInProgress, setIsActionInProgress] = useState(false);
  const [error, setError] = useState<string>();
  const authActionInFlightRef = useRef(false);

  useEffect(() => {
    if (!authConfiguration.isConfigured || supabaseClient === undefined) {
      setIsLoading(false);
      return;
    }

    let isCurrent = true;
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      if (!isCurrent) {
        return;
      }
      setUser(nextSession?.user);
      setError(undefined);
      setIsLoading(false);
      if (nextSession !== null) {
        cleanupOAuthCodeFromUrl();
      }
    });

    void supabaseClient.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!isCurrent) {
          return;
        }
        if (sessionError !== null) {
          setError('ログイン状態を確認できませんでした。接続を確認して、もう一度お試しください。');
          return;
        }
        setUser(data.session?.user);
        if (data.session !== null) {
          cleanupOAuthCodeFromUrl();
        }
      })
      .catch(() => {
        if (isCurrent) {
          setError('ログイン状態を確認できませんでした。接続を確認して、もう一度お試しください。');
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (authActionInFlightRef.current) {
      return;
    }
    if (!authConfiguration.isConfigured || supabaseClient === undefined) {
      setError('クラウド同期は設定されていません。');
      return;
    }

    authActionInFlightRef.current = true;
    setIsActionInProgress(true);
    setError(undefined);
    try {
      const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString();
      const { error: signInError } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (signInError !== null) {
        setError(
          'Googleログインを開始できませんでした。接続と設定を確認して、もう一度お試しください。',
        );
      }
    } catch {
      setError(
        'Googleログインを開始できませんでした。接続と設定を確認して、もう一度お試しください。',
      );
    } finally {
      authActionInFlightRef.current = false;
      setIsActionInProgress(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (authActionInFlightRef.current) {
      return;
    }
    if (!authConfiguration.isConfigured || supabaseClient === undefined) {
      setError('クラウド同期は設定されていません。');
      return;
    }

    authActionInFlightRef.current = true;
    setIsActionInProgress(true);
    setError(undefined);
    try {
      // Signing out of SC must not revoke sessions belonging to the NW app.
      const { error: signOutError } = await supabaseClient.auth.signOut({ scope: 'local' });
      if (signOutError !== null) {
        setError('ログアウトできませんでした。接続を確認して、もう一度お試しください。');
      }
    } catch {
      setError('ログアウトできませんでした。接続を確認して、もう一度お試しください。');
    } finally {
      authActionInFlightRef.current = false;
      setIsActionInProgress(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isConfigured: authConfiguration.isConfigured,
      isLoading,
      isActionInProgress,
      error,
      signInWithGoogle,
      signOut,
      clearError: () => setError(undefined),
    }),
    [error, isActionInProgress, isLoading, signInWithGoogle, signOut, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// The hook intentionally shares the provider state managed in this module.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('認証情報はAuthProviderの配下で利用してください。');
  }
  return context;
}
