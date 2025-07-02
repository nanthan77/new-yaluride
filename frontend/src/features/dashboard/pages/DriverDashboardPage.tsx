import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n/config'; // Your i18next configuration

import { store } from './store';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { selectIsAuthInitialized, selectIsAuthenticated, setAuth, setAuthInitialized } from './store/slices/authSlice';
import { selectTheme } from './store/slices/settingsSlice';

import { supabase } from './services/supabaseClient';

// --- Layouts ---
import MainLayout from './components/layout/MainLayout';
import AuthLayout from './components/layout/AuthLayout';
import MinimalLayout from './components/layout/MinimalLayout';

// --- Components & Pages (Lazy Loaded) ---
const GlobalSpinner: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="fixed inset-0 flex flex-col items-center justify-center bg-white dark:bg-gray-900 z-50">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
    <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">{message}</p>
  </div>
);

const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./features/auth/pages/LoginPage'));
const SignupPage = lazy(() => import('./features/auth/pages/SignupPage'));
const DriverDashboardPage = lazy(() => import('./features/dashboard/pages/DriverDashboardPage'));
const RideHistoryPage = lazy(() => import('./features/ride/pages/RideHistoryPage'));
const SettingsPage = lazy(() => import('./features/settings/pages/SettingsPage'));
const NotificationsPage = lazy(() => import('./features/notifications/pages/NotificationsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const RideBookingPage = lazy(() => import('./features/ride/pages/RideBookingPage'));
const MarketplaceBrowsePage = lazy(() => import('./features/marketplace/pages/MarketplaceBrowsePage'));
const PostJourneyPage = lazy(() => import('./features/marketplace/pages/PostJourneyPage'));
const ProfilePage = lazy(() => import('./features/profile/pages/ProfilePage'));

// --- Protected Route Component ---
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isAuthInitialized = useAppSelector(selectIsAuthInitialized);
  const location = useLocation();

  if (!isAuthInitialized) {
    return <GlobalSpinner message="Authenticating..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// --- Theme Manager Component ---
const ThemeManager: React.FC = () => {
  const theme = useAppSelector(selectTheme);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  return null; // This component does not render anything
};

// --- Main App Logic Component ---
const AppLogic: React.FC = () => {
  const dispatch = useAppDispatch();
  const isAuthInitialized = useAppSelector(selectIsAuthInitialized);

  useEffect(() => {
    // Check initial session state on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      dispatch(setAuth({ user: session?.user ?? null, session }));
      dispatch(setAuthInitialized(true));
    });

    // Subscribe to Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch(setAuth({ user: session?.user ?? null, session }));
      if (!isAuthInitialized) {
        dispatch(setAuthInitialized(true));
      }
    });

    // Cleanup subscription on component unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, [dispatch, isAuthInitialized]);

  // Show a global spinner while the initial auth state is being determined
  if (!isAuthInitialized) {
    return <GlobalSpinner message="Initializing YALURIDE..." />;
  }

  return (
    <Router>
      <ThemeManager />
      <Suspense fallback={<GlobalSpinner />}>
        <Routes>
          {/* Public Routes with Auth Layout */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            {/* Add forgot-password, reset-password routes here */}
          </Route>

          {/* Protected Routes with Main App Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            {/* Default route after login */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DriverDashboardPage />} />
            <Route path="book-ride" element={<RideBookingPage />} />
            <Route path="marketplace" element={<MarketplaceBrowsePage />} />
            <Route path="post-journey" element={<PostJourneyPage />} />
            <Route path="ride-history" element={<RideHistoryPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            {/* Add other nested protected routes here */}
          </Route>
          
          {/* Routes with Minimal Layout */}
          <Route element={<MinimalLayout />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
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
            className: 'dark:bg-gray-700 dark:text-white',
            style: {
              margin: '40px',
              background: '#FFFFFF',
              color: '#1F2937',
              zIndex: 9999,
            },
            duration: 5000,
            success: {
              style: {
                background: '#F0FFF4', // green-50
                color: '#2F855A', // green-700
              },
            },
            error: {
              style: {
                background: '#FFF5F5', // red-50
                color: '#C53030', // red-700
              },
            },
          }}
        />
        <AppLogic />
      </I18nextProvider>
    </Provider>
  );
};

export default App;
