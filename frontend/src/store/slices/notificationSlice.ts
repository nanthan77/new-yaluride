import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n/config'; // Your i18next configuration

import { store } from './store';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { selectIsAuthInitialized, selectIsAuthenticated, setAuth, setAuthInitialized } from './store/slices/authSlice';
import { supabase } from './services/supabaseClient';

// --- Components & Pages (Lazy Loaded) ---
const GlobalSpinner = () => <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-50"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div></div>;

const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./features/auth/pages/LoginPage'));
const DriverDashboardPage = lazy(() => import('./features/dashboard/pages/DriverDashboardPage'));
const RideHistoryPage = lazy(() => import('./features/ride/pages/RideHistoryPage'));
const SettingsPage = lazy(() => import('./features/settings/pages/SettingsPage'));
const NotificationsPage = lazy(() => import('./features/notifications/pages/NotificationsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// --- Protected Route Component ---
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isAuthInitialized = useAppSelector(selectIsAuthInitialized);

  if (!isAuthInitialized) {
    return <GlobalSpinner />;
  }

  if (!isAuthenticated) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to. This allows us to send them along to that page after they login.
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// --- Main App Logic Component ---
const AppLogic: React.FC = () => {
  const dispatch = useAppDispatch();
  const isAuthInitialized = useAppSelector(selectIsAuthInitialized);

  useEffect(() => {
    // Subscribe to Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Dispatch action to update Redux store with the new session/user info
      dispatch(setAuth({ user: session?.user ?? null, session }));
      if (!isAuthInitialized) {
        dispatch(setAuthInitialized(true));
      }
    });

    // Check initial session state on load, but only if not already initialized
    if (!isAuthInitialized) {
        supabase.auth.getSession().then(({ data: { session } }) => {
            dispatch(setAuth({ user: session?.user ?? null, session }));
            dispatch(setAuthInitialized(true));
        });
    }

    // Cleanup subscription on component unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, [dispatch, isAuthInitialized]);

  // Show a global spinner while the initial auth state is being determined
  if (!isAuthInitialized) {
    return <GlobalSpinner />;
  }

  return (
    <Router>
      <Suspense fallback={<GlobalSpinner />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          {/* Add other public routes like /signup, /about, etc. */}

          {/* Protected Routes */}
          <Route
            path="/driver-dashboard"
            element={<ProtectedRoute><DriverDashboardPage /></ProtectedRoute>}
          />
          <Route
            path="/ride-history"
            element={<ProtectedRoute><RideHistoryPage /></ProtectedRoute>}
          />
          <Route
            path="/settings"
            element={<ProtectedRoute><SettingsPage /></ProtectedRoute>}
          />
          <Route
            path="/notifications"
            element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>}
          />
          {/* Add other protected routes */}

          {/* Not Found Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </Router>
  );
};

// --- App Entry Point ---
const App: React.FC = () => {
  return (
    <Provider store={store}>
      <I18nextProvider i18n={i18n}>
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{
            className: '',
            style: {
              margin: '40px',
              background: '#363636',
              color: '#fff',
              zIndex: 1,
            },
            duration: 5000,
          }}
        />
        <AppLogic />
      </I18nextProvider>
    </Provider>
  );
};

export default App;
