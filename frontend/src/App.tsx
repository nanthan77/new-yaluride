import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';

import { store, RootState } from './store';
import { ThemeProvider } from './contexts/ThemeContext';
import { FullPageLoader } from './components/common/FullPageLoader';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import PWAInstallPrompt from './components/common/PWAInstallPrompt';
import MainLayout from './components/layout/MainLayout';
import AuthLayout from './components/layout/AuthLayout';
// Placeholder for an auth action
// import { checkUserSession } from './features/auth/authSlice';

// --- Error Boundary Component ---
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // You can log the error to an error reporting service here
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-red-500">
          <h1 className="text-2xl font-bold">Something went wrong.</h1>
          <p className="mt-2">Please try refreshing the page.</p>
          {this.state.error && (
            <pre className="mt-4 p-4 bg-gray-200 dark:bg-gray-800 rounded-md text-xs">
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Lazy-loaded Pages ---
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./features/auth/pages/LoginPage'));
const SignupPage = lazy(() => import('./features/auth/pages/SignupPage'));
const RideStatusPage = lazy(() => import('./features/rides/pages/RideStatusPage'));
const VerificationPage = lazy(() => import('./features/profile/pages/VerificationPage'));
const CreateTourPackagePage = lazy(() => import('./features/tours/pages/CreateTourPackagePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// --- Protected Route Component ---
const ProtectedRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (!isAuthenticated) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to. This allows us to send them along to that page after they log in.
    return <Navigate to="/login" replace />;
  }

  return children;
};

// --- Main App Component ---
function App() {
  // useEffect(() => {
  //   // On initial app load, check if there's a valid session
  //   store.dispatch(checkUserSession());
  // }, []);

  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        {/* Routes for authenticated users, wrapped in the main layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="ride/:id" element={<RideStatusPage />} />
          <Route path="profile/verify" element={<VerificationPage />} />
          <Route path="driver/tours/new" element={<CreateTourPackagePage />} />
          {/* Add other authenticated routes here */}
        </Route>

        {/* Routes for authentication, using a separate simpler layout */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          {/* Add forgot-password, reset-password routes here */}
        </Route>

        {/* Catch-all 404 route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

// --- Root Component with all Providers ---
function Root() {
  return (
    <React.StrictMode>
      <Provider store={store}>
        <ThemeProvider>
          <ErrorBoundary>
            <BrowserRouter>
              <App />
              {/* Global components that render on top of all pages */}
              <Toaster
                position="top-center"
                reverseOrder={false}
                toastOptions={{
                  className: 'dark:bg-gray-700 dark:text-white',
                }}
              />
              <OfflineIndicator />
              <PWAInstallPrompt />
            </BrowserRouter>
          </ErrorBoundary>
        </ThemeProvider>
      </Provider>
    </React.StrictMode>
  );
}

export default Root;
