import { useEffect, useState } from 'react';
import { useDisplaySettings } from '../features/settings/DisplaySettingsContext';
import { Icon } from './Icon';

export function ThemeToggle() {
  const { settings, isLoading, updateTheme } = useDisplaySettings();
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => getSystemTheme());
  const resolvedTheme = settings.theme === 'system' ? systemTheme : settings.theme;
  const nextTheme = resolvedTheme === 'light' ? 'dark' : 'light';

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (media === undefined) {
      return;
    }
    const update = () => setSystemTheme(media.matches ? 'dark' : 'light');
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  function toggleTheme() {
    void updateTheme(nextTheme);
  }

  return (
    <button
      aria-label={`テーマを${nextTheme === 'dark' ? 'ダークモード' : 'ライトモード'}に切り替え`}
      aria-pressed={resolvedTheme === 'dark'}
      className="icon-button"
      disabled={isLoading}
      onClick={toggleTheme}
      type="button"
    >
      <Icon name="theme" />
      <span className="visually-hidden">テーマを切り替え</span>
    </button>
  );
}

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
