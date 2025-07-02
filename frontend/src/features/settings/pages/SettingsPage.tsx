import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Sun, Moon, Laptop, Languages, Bell, Palette } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  selectTheme,
  setTheme,
  selectLanguage,
  setLanguage,
  selectNotificationPreferences,
  toggleNotificationPreference,
  Theme,
  LanguageCode,
  NotificationPreferences,
} from '../../../store/slices/settingsSlice';
import { ToggleSwitch } from '../../../components/common/ToggleSwitch';

// --- Reusable Components ---

interface SettingsCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
}

const SettingsCard: React.FC<SettingsCardProps> = ({ title, description, icon: Icon, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden"
  >
    <div className="p-6">
      <div className="flex items-center">
        <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg mr-4">
          <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  </motion.div>
);

// --- Main Settings Page Component ---

const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();

  // Selectors for settings from Redux store
  const currentTheme = useAppSelector(selectTheme);
  const currentLanguage = useAppSelector(selectLanguage);
  const notificationPrefs = useAppSelector(selectNotificationPreferences);

  const handleThemeChange = (theme: Theme) => {
    dispatch(setTheme(theme));
  };

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = event.target.value as LanguageCode;
    dispatch(setLanguage(newLang));
    i18n.changeLanguage(newLang);
  };

  const handleNotificationToggle = (key: keyof NotificationPreferences) => {
    dispatch(toggleNotificationPreference(key));
  };

  const notificationPreferenceKeyList: (keyof NotificationPreferences)[] = [
    'app_notifications_enabled',
    'email_enabled',
    'sms_enabled',
    'ride_updates',
    'promotions',
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('settings.title')}</h1>
      </motion.div>

      <div className="mt-8 grid grid-cols-1 gap-8">
        {/* --- Theme Settings --- */}
        <SettingsCard
          title={t('settings.theme.title')}
          description={t('settings.theme.description')}
          icon={Palette}
        >
          <div className="grid grid-cols-3 gap-4">
            <ThemeButton
              label={t('settings.theme.light')}
              icon={Sun}
              isActive={currentTheme === 'light'}
              onClick={() => handleThemeChange('light')}
            />
            <ThemeButton
              label={t('settings.theme.dark')}
              icon={Moon}
              isActive={currentTheme === 'dark'}
              onClick={() => handleThemeChange('dark')}
            />
            <ThemeButton
              label={t('settings.theme.system')}
              icon={Laptop}
              isActive={currentTheme === 'system'}
              onClick={() => handleThemeChange('system')}
            />
          </div>
        </SettingsCard>

        {/* --- Language Settings --- */}
        <SettingsCard
          title={t('settings.language.title')}
          description={t('settings.language.description')}
          icon={Languages}
        >
          <select
            value={currentLanguage}
            onChange={handleLanguageChange}
            className="form-input w-full"
            aria-label={t('settings.language.title')}
          >
            <option value="en">{t('languages.en')}</option>
            <option value="si">{t('languages.si')}</option>
            <option value="ta">{t('languages.ta')}</option>
          </select>
        </SettingsCard>

        {/* --- Notification Settings --- */}
        <SettingsCard
          title={t('settings.notifications.title')}
          description={t('settings.notifications.description')}
          icon={Bell}
        >
          <div className="space-y-4">
            {notificationPreferenceKeyList.map((key) => (
              <div key={key} className="flex items-center justify-between">
                <label htmlFor={key} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t(`settings.notifications.${key}`)}
                </label>
                <ToggleSwitch
                  id={key}
                  checked={notificationPrefs[key]}
                  onChange={() => handleNotificationToggle(key)}
                />
              </div>
            ))}
          </div>
        </SettingsCard>
      </div>
    </div>
  );
};

// --- Helper Component for Theme Button ---
interface ThemeButtonProps {
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick: () => void;
}

const ThemeButton: React.FC<ThemeButtonProps> = ({ label, icon: Icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-200
      ${isActive
        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/50 shadow-lg'
        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700'
      }`}
    aria-pressed={isActive}
  >
    <Icon className={`h-6 w-6 mb-2 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
    <span className={`text-sm font-semibold ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
      {label}
    </span>
  </button>
);

export default SettingsPage;
