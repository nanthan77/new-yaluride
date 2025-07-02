import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Users,
  FileText,
  Settings,
  PlusCircle,
  Briefcase,
  LogOut,
} from 'lucide-react';
import { IconType } from 'react-icons';
import clsx from 'clsx';

// --- Placeholder Components for Each Tab ---
// In a real application, these would be imported from their own files within the 'corporate' feature directory.

const EmployeeManagementTab: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('corporate.tabs.employeeManagement')}</h2>
      <p className="mt-2 text-gray-500 dark:text-gray-400">{t('common.contentPlaceholder')}</p>
      {/* TODO: Add employee list, search, and invite functionality here */}
    </div>
  );
};

const TravelPoliciesTab: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('corporate.tabs.travelPolicies')}</h2>
      <p className="mt-2 text-gray-500 dark:text-gray-400">{t('common.contentPlaceholder')}</p>
      {/* TODO: Add policy creation, editing, and assignment UI here */}
    </div>
  );
};

const InvoicingTab: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('corporate.tabs.invoicing')}</h2>
      <p className="mt-2 text-gray-500 dark:text-gray-400">{t('common.contentPlaceholder')}</p>
      {/* TODO: Add invoice history, download options, and billing details here */}
    </div>
  );
};

const CorporateSettingsTab: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('corporate.tabs.settings')}</h2>
      <p className="mt-2 text-gray-500 dark:text-gray-400">{t('common.contentPlaceholder')}</p>
      {/* TODO: Add corporate profile settings, payment methods, etc. here */}
    </div>
  );
};

// --- Main Component ---

type Tab = 'employees' | 'policies' | 'invoicing' | 'settings';

interface NavItem {
  id: Tab;
  label: string;
  icon: IconType;
  component: React.ReactNode;
}

const CorporatePortalPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('employees');

  const navItems: NavItem[] = [
    { id: 'employees', label: t('corporate.nav.employees', 'Employees'), icon: Users, component: <EmployeeManagementTab /> },
    { id: 'policies', label: t('corporate.nav.policies', 'Travel Policies'), icon: FileText, component: <TravelPoliciesTab /> },
    { id: 'invoicing', label: t('corporate.nav.invoicing', 'Invoicing'), icon: FileText, component: <InvoicingTab /> },
    { id: 'settings', label: t('corporate.nav.settings', 'Settings'), icon: Settings, component: <CorporateSettingsTab /> },
  ];

  const activeComponent = navItems.find(item => item.id === activeTab)?.component;

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 flex-shrink-0 bg-gray-800 text-white flex flex-col">
        <div className="h-16 flex items-center justify-center px-4 border-b border-gray-700">
          <Briefcase className="h-7 w-7 text-blue-400 mr-3" />
          <h1 className="text-xl font-bold text-white tracking-wider">
            {t('corporate.portalTitleShort', 'YALURIDE Corp')}
          </h1>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={clsx(
                'group rounded-md px-3 py-2 flex items-center text-sm font-medium w-full text-left transition-colors duration-150',
                activeTab === item.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              )}
            >
              <item.icon
                className={clsx(
                  'mr-3 flex-shrink-0 h-6 w-6',
                  activeTab === item.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'
                )}
              />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="px-4 py-6 border-t border-gray-700">
          <button
            className="group rounded-md px-3 py-2 flex items-center text-sm font-medium w-full text-left text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-150"
          >
            <LogOut className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-300" />
            <span className="truncate">{t('common.actions.logout', 'Logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="bg-white dark:bg-gray-800/50 backdrop-blur-sm sticky top-0 z-10 shadow-sm p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {navItems.find(item => item.id === activeTab)?.label}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('corporate.portalSubtitle', 'Manage your organization\'s travel')}
              </p>
            </div>
            <button className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
              <PlusCircle className="h-5 w-5 mr-2" />
              {t('corporate.inviteEmployee', 'Invite Employee')}
            </button>
          </div>
        </header>

        <div className="p-6 space-y-6">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              {activeComponent}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default CorporatePortalPage;
