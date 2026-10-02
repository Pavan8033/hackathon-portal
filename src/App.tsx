import { BrowserRouter } from 'react-router-dom';
import { EventProvider } from './context/EventContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppRoutes } from './routes/AppRoutes';
import { ErrorBoundary } from './components/common/ErrorBoundary';

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <EventProvider>
          <ToastProvider>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </ToastProvider>
        </EventProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
