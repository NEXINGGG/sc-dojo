import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { database } from '../../database/database';
import type {
  FontSizePreference,
  ReducedMotionPreference,
  ThemePreference,
} from '../../database/types';
import {
  defaultDisplaySettings,
  normalizeDisplaySettings,
  resetDisplayPreferences,
  type DisplaySettings,
} from './displaySettings';
import { SettingsRepository } from './settingsRepository';
import { usePwa } from '../pwa/PwaContext';

interface DisplaySettingsContextValue {
  settings: DisplaySettings;
  isLoading: boolean;
  error?: string;
  updateTheme: (theme: ThemePreference) => Promise<void>;
  updateFontSize: (fontSize: FontSizePreference) => Promise<void>;
  updateReducedMotion: (reducedMotion: ReducedMotionPreference) => Promise<void>;
  resetDisplaySettings: () => Promise<void>;
  reloadDisplaySettings: () => Promise<void>;
  clearError: () => void;
}

const DisplaySettingsContext = createContext<DisplaySettingsContextValue | undefined>(undefined);
const settingsRepository = new SettingsRepository(database);

export function DisplaySettingsProvider({ children }: PropsWithChildren) {
  const { confirmPersistenceSaved, reportPersistenceFailure } = usePwa();
  const [settings, setSettings] = useState<DisplaySettings>({ ...defaultDisplaySettings });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let isCurrent = true;

    async function load() {
      try {
        const stored = await settingsRepository.getDisplaySettings();
        if (isCurrent) {
          setSettings(stored);
        }
      } catch {
        if (isCurrent) {
          setError(
            '表示設定を読み込めませんでした。端末の保存領域を確認して、再読み込みしてください。',
          );
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    applySettingsToDocument(settings);
  }, [settings]);

  const persist = useCallback(
    async (next: DisplaySettings) => {
      const previous = settings;
      const normalized = normalizeDisplaySettings(next);
      setSettings(normalized);
      setError(undefined);

      try {
        await settingsRepository.saveDisplaySettings(normalized);
        confirmPersistenceSaved();
      } catch {
        setSettings(previous);
        reportPersistenceFailure('表示設定を保存できませんでした。');
        setError('表示設定を保存できませんでした。現在の設定を確認して、もう一度お試しください。');
      }
    },
    [confirmPersistenceSaved, reportPersistenceFailure, settings],
  );

  const reloadDisplaySettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const stored = await settingsRepository.getDisplaySettings();
      setSettings(stored);
      setError(undefined);
    } catch {
      setError(
        '表示設定を読み込めませんでした。端末の保存領域を確認して、再読み込みしてください。',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = useMemo<DisplaySettingsContextValue>(
    () => ({
      settings,
      isLoading,
      error,
      updateTheme: async (theme) => persist({ ...settings, theme }),
      updateFontSize: async (fontSize) => persist({ ...settings, fontSize }),
      updateReducedMotion: async (reducedMotion) => persist({ ...settings, reducedMotion }),
      resetDisplaySettings: async () => persist(resetDisplayPreferences(settings)),
      reloadDisplaySettings,
      clearError: () => setError(undefined),
    }),
    [error, isLoading, persist, reloadDisplaySettings, settings],
  );

  return (
    <DisplaySettingsContext.Provider value={value}>{children}</DisplaySettingsContext.Provider>
  );
}

// The hook shares the provider state and intentionally remains colocated with it.
// eslint-disable-next-line react-refresh/only-export-components
export function useDisplaySettings(): DisplaySettingsContextValue {
  const context = useContext(DisplaySettingsContext);
  if (context === undefined) {
    throw new Error('表示設定はDisplaySettingsProviderの配下で利用してください。');
  }
  return context;
}

function applySettingsToDocument(settings: DisplaySettings): void {
  const root = document.documentElement;

  if (settings.theme === 'system') {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = settings.theme;
  }
  root.dataset.fontSize = settings.fontSize;
  root.dataset.reducedMotion = settings.reducedMotion;
}
