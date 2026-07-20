import type {
  FontSizePreference,
  ReducedMotionPreference,
  SettingRow,
  ThemePreference,
} from '../../database/types';
import type { SubjectId } from '../../domain/subject';

export interface DisplaySettings {
  theme: ThemePreference;
  fontSize: FontSizePreference;
  reducedMotion: ReducedMotionPreference;
  shuffleChoices: boolean;
}

export const defaultDisplaySettings: Readonly<DisplaySettings> = {
  theme: 'system',
  fontSize: 'standard',
  reducedMotion: 'system',
  shuffleChoices: false,
};

export const themeOptions = ['system', 'light', 'dark'] as const;
export const fontSizeOptions = ['small', 'standard', 'large', 'extra_large'] as const;
export const reducedMotionOptions = ['system', 'reduce', 'no_preference'] as const;

export function normalizeDisplaySettings(value: unknown): DisplaySettings {
  if (!isRecord(value)) {
    return { ...defaultDisplaySettings };
  }

  return {
    theme: isThemePreference(value.theme) ? value.theme : defaultDisplaySettings.theme,
    fontSize: isFontSizePreference(value.fontSize)
      ? value.fontSize
      : defaultDisplaySettings.fontSize,
    reducedMotion: isReducedMotionPreference(value.reducedMotion)
      ? value.reducedMotion
      : defaultDisplaySettings.reducedMotion,
    shuffleChoices: value.shuffleChoices === true,
  };
}

export function toSettingRow(
  settings: DisplaySettings,
  updatedAt: string,
  selectedSubject: SubjectId = 'a1',
): SettingRow {
  return {
    key: 'appearance',
    selectedSubject,
    ...normalizeDisplaySettings(settings),
    updatedAt,
  };
}

export function resetDisplayPreferences(settings: DisplaySettings): DisplaySettings {
  return {
    ...settings,
    theme: defaultDisplaySettings.theme,
    fontSize: defaultDisplaySettings.fontSize,
    reducedMotion: defaultDisplaySettings.reducedMotion,
  };
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function isFontSizePreference(value: unknown): value is FontSizePreference {
  return value === 'small' || value === 'standard' || value === 'large' || value === 'extra_large';
}

export function isReducedMotionPreference(value: unknown): value is ReducedMotionPreference {
  return value === 'system' || value === 'reduce' || value === 'no_preference';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
