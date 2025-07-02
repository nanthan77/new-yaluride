import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import MinimalLayout from '../../components/layout/MinimalLayout';

/**
 * NotFoundPage component.
 * This page is displayed whenever a user navigates to a route that does not exist.
 * It provides a clear 404 error message and a link to return to the application's home page.
 */
const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <MinimalLayout>
      <div className="flex flex-col items-center text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
        
        <h1 className="text-6xl font-bold text-gray-800 dark:text-white">404</h1>
        
        <h2 className="mt-2 text-2xl font-semibold text-gray-700 dark:text-gray-200">
          {t('notFound.title', 'Page Not Found')}
        </h2>
        
        <p className="mt-4 text-gray-500 dark:text-gray-400">
          {t('notFound.message', "Sorry, we couldn’t find the page you’re looking for.")}
        </p>
        
        <Link
          to="/"
          className="mt-8 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          {t('notFound.goHome', 'Go back home')}
        </Link>
      </div>
    </MinimalLayout>
  );
};

export default NotFoundPage;
