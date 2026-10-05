import { NavLink, Outlet } from 'react-router-dom';
import { APP_SHORT_NAME } from '../app/appIdentity';
import { Icon } from '../components/Icon';
import { ThemeToggle } from '../components/ThemeToggle';
import { PwaNotifications } from '../features/pwa/PwaNotifications';

const navigationItems = [
  { to: '/', label: 'ホーム', icon: 'home' },
  { to: '/practice', label: '演習', icon: 'practice' },
  { to: '/exam', label: '模試', icon: 'exam' },
  { to: '/progress', label: '成績', icon: 'progress' },
  { to: '/settings', label: '設定', icon: 'settings' },
] as const;

export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-bar">
        <span className="app-brand">{APP_SHORT_NAME}</span>
        <ThemeToggle />
      </header>
      <PwaNotifications />
      <main className="page-content">
        <Outlet />
      </main>
      <nav aria-label="メインナビゲーション" className="bottom-navigation">
        {navigationItems.map((item) => (
          <NavLink
            className={({ isActive }) => `navigation-item${isActive ? ' is-active' : ''}`}
            end={item.to === '/'}
            key={item.to}
            to={item.to}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
