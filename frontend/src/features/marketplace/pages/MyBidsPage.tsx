import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { I18nextProvider } from 'react-i18next';
import { Toaster } from 'react-hot-toast';

import { store } from './store';
import i18n from './i18n/config';
import App from './App';
import './styles/global.css'; // Import global styles for the application

// Get the root element from the DOM where the React app will be mounted.
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Failed to find the root element. Please ensure your HTML has an element with id 'root'.");
}

// Create a root for the React application using the modern createRoot API.
const root = ReactDOM.createRoot(rootElement);

// Render the application.
root.render(
  <React.StrictMode>
    {/* 
      The Redux Provider makes the Redux store available to any nested components that
      have been wrapped in the connect() function.
    */}
    <Provider store={store}>
      {/* 
        The I18nextProvider passes down the i18n instance to all components
        in the component tree.
      */}
      <I18nextProvider i18n={i18n}>
        {/* 
          The Toaster component is placed at the top level to handle all
          toast notifications throughout the application.
        */}
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
                background: '#F0FFF4', // Tailwind green-50
                color: '#2F855A',      // Tailwind green-700
              },
            },
            error: {
              style: {
                background: '#FFF5F5', // Tailwind red-50
                color: '#C53030',      // Tailwind red-700
              },
            },
          }}
        />
        {/* The main App component is the root of the application's UI. */}
        <App />
      </I18nextProvider>
    </Provider>
  </React.StrictMode>
);
