import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import GlobalSpinner from '../../../components/common/GlobalSpinner';
import { useAppSelector } from '../../../store/hooks';
import { selectIsAuthenticated } from '../store/slices/authSlice';

/**
 * AuthCallbackPage component.
 * This is a dedicated page that handles the redirect from an OAuth provider (e.g., Google).
 * Supabase's client library automatically detects session information from the URL fragment
 * and triggers the `onAuthStateChange` listener set up in `App.tsx`.
 *
 * This component's primary role is to provide user feedback during this brief processing period
 * and handle cases where the authentication might fail.
 */
const AuthCallbackPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Check if authentication becomes successful.
    // The onAuthStateChange listener in App.tsx will update the Redux store,
    // which will cause `isAuthenticated` to become true.
    if (isAuthenticated) {
      toast.success(t('auth.loginSuccess'));
      // Redirect to the main dashboard upon successful authentication.
      navigate('/dashboard', { replace: true });
    }

    // 2. Handle potential errors or timeouts.
    // If after a certain period the user is still on this page and not authenticated,
    // it means something went wrong with the OAuth callback.
    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        const errorMessage = t('auth.error.oauthCallbackFailed');
        setError(errorMessage);
        toast.error(errorMessage);
        // Redirect back to the login page after showing the error.
        setTimeout(() => navigate('/login', { replace: true }), 2000);
      }
    }, 10000); // 10-second timeout

    // 3. Cleanup the timer on component unmount.
    return () => clearTimeout(timer);
  }, [isAuthenticated, navigate, t]);
  
  // Render a loading state while waiting for the session to be processed.
  if (error) {
    return (
      <GlobalSpinner 
        message={t('common.redirectingToLogin')} 
        error={error}
      />
    );
  }

  return (
    <GlobalSpinner 
      message={t('auth.finalizingLogin')} 
    />
  );
};

export default AuthCallbackPage;
