import { useState } from 'react';
import { Icon } from './Icon';

interface ThemeToggleProps {
  onThemeChange: (theme: 'light' | 'dark') => void;
}

export function ThemeToggle({ onThemeChange }: ThemeToggleProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const nextTheme = theme === 'light' ? 'dark' : 'light';

  function toggleTheme() {
    setTheme(nextTheme);
    onThemeChange(nextTheme);
  }

  return (
    <button
      aria-label={`テーマを${nextTheme === 'dark' ? 'ダークモード' : 'ライトモード'}に切り替え`}
      aria-pressed={theme === 'dark'}
      className="icon-button"
      onClick={toggleTheme}
      type="button"
    >
      <Icon name="theme" />
      <span className="visually-hidden">テーマを切り替え</span>
    </button>
  );
}
