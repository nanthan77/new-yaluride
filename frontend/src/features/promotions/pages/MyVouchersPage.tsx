import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGetBadgesForUserQuery } from '../../../services/api/gamificationApi';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, ShieldCheck, Star, AlertTriangle } from 'lucide-react';
import { UserBadgeDto } from '../../../services/api/gamificationApi';
import clsx from 'clsx';

// --- Reusable Sub-components ---

const BadgeSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex items-center space-x-4 animate-pulse">
    <div className="h-16 w-16 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
    <div className="flex-1 space-y-3">
      <div className="h-5 w-3/4 bg-gray-300 dark:bg-gray-700 rounded"></div>
      <div className="h-4 w-full bg-gray-300 dark:bg-gray-700 rounded"></div>
      <div className="h-4 w-1/2 bg-gray-300 dark:bg-gray-700 rounded"></div>
    </div>
  </div>
);

const BadgeCard: React.FC<{ userBadge: UserBadgeDto }> = ({ userBadge }) => {
  const { t } = useTranslation();
  const { badge, earned_at } = userBadge;

  const earnedDate = new Date(earned_at);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 flex items-start space-x-4 border border-gray-200 dark:border-gray-700"
    >
      <div className="flex-shrink-0">
        {badge.icon_url ? (
          <img src={badge.icon_url} alt={badge.name} className="h-16 w-16" />
        ) : (
          <div className="h-16 w-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
            <Star className="h-8 w-8 text-white" />
          </div>
        )}
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{badge.name}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{badge.description}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
          {t('gamification.earnedOn', 'Earned on')}: {earnedDate.toLocaleDateString()}
        </p>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold text-yellow-500 dark:text-yellow-400">
          +{badge.points_reward} {t('gamification.points', 'Points')}
        </div>
      </div>
    </motion.div>
  );
};

// --- Main Page Component ---

const MyBadgesPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: userBadges, error, isLoading, isFetching } = useGetBadgesForUserQuery();

  const renderContent = () => {
    if (isLoading || isFetching) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <BadgeSkeleton key={i} />)}
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">{t('errors.fetchErrorTitle')}</h3>
          <p className="text-red-600 dark:text-red-300 mt-1">{t('errors.generic')}</p>
        </div>
      );
    }

    if (!userBadges || userBadges.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center text-center p-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <Award className="h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200">{t('gamification.noBadgesTitle')}</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md">
            {t('gamification.noBadgesSubtitle')}
          </p>
        </div>
      );
    }

    return (
      <AnimatePresence>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userBadges.map((ub) => (
            <BadgeCard key={ub.badge_id} userBadge={ub} />
          ))}
        </div>
      </AnimatePresence>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          <ShieldCheck className="mr-3 h-8 w-8 text-purple-600 dark:text-purple-400" />
          {t('gamification.myBadgesTitle')}
        </h1>
        <p className="mt-2 text-md text-gray-600 dark:text-gray-400">
          {t('gamification.myBadgesSubtitle')}
        </p>
      </header>

      <div>
        {renderContent()}
      </div>
    </div>
  );
};

export default MyBadgesPage;
