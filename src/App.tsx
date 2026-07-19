import { HashRouter } from 'react-router-dom';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { DisplaySettingsProvider } from './features/settings/DisplaySettingsContext';
import { PwaProvider } from './features/pwa/PwaContext';
import { AppRoutes } from './routes/AppRoutes';

export function App() {
  return (
    <AppErrorBoundary>
      <PwaProvider>
        <DisplaySettingsProvider>
          <HashRouter>
            <AppRoutes />
          </HashRouter>
        </DisplaySettingsProvider>
      </PwaProvider>
    </AppErrorBoundary>
  );
}
