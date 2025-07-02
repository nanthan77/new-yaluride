import React from 'react';

/**
 * Defines the props for the MinimalLayout component.
 */
interface MinimalLayoutProps {
  children: React.ReactNode;
}

/**
 * A minimal layout component for simple, centered content pages like
 * the 404 Not Found page or a maintenance page.
 *
 * @param {MinimalLayoutProps} props - The component props.
 * @returns {React.ReactElement} The rendered minimal layout component.
 */
const MinimalLayout: React.FC<MinimalLayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-900">
      <main className="w-full max-w-md p-6 text-center">
        {children}
      </main>
    </div>
  );
};

export default MinimalLayout;
