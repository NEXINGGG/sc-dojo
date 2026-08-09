import { HashRouter } from 'react-router-dom';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { DisplaySettingsProvider } from './features/settings/DisplaySettingsContext';
import { PwaProvider } from './features/pwa/PwaContext';
import { SubjectProvider } from './features/subjects/SubjectContext';
import { AppRoutes } from './routes/AppRoutes';
import { AuthProvider } from './features/auth/AuthContext';
import { CloudSyncProvider } from './features/sync/CloudSyncContext';

export function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <CloudSyncProvider>
          <PwaProvider>
            <SubjectProvider>
              <DisplaySettingsProvider>
                <HashRouter>
                  <AppRoutes />
                </HashRouter>
              </DisplaySettingsProvider>
            </SubjectProvider>
          </PwaProvider>
        </CloudSyncProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}
