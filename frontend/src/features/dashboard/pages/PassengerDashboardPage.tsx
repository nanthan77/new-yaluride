import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Car, MapPin, History, Wallet, PlusSquare, Star, ArrowRight } from 'lucide-react';

import { useAppSelector } from '../../../store/hooks';
import { selectYalurideProfile } from '../../auth/store/slices/authSlice';
import { Ride } from '../../../types/yaluride'; // Assuming Ride type is defined

// --- Mock Data (to be replaced with data from Redux store/API) ---
const mockRecentRides: Partial<Ride>[] = [
  {
    id: 'ride1',
    dropoff_location_text: 'Galle Face Green',
    status: 'COMPLETED',
    final_fare: 1500,
    completed_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
  },
  {
    id: 'ride2',
    dropoff_location_text: 'Bandaranaike International Airport (CMB)',
    status: 'SCHEDULED',
    final_fare: 12000,
    scheduled_pickup_time: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
  },
  {
    id: 'ride3',
    dropoff_location_text: 'Kandy View Point',
    status: 'COMPLETED',
    final_fare: 8500,
    completed_at: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
  },
];

const mockSavedLocations = [
  { name: 'Home', address: '123, Galle Road, Colombo 03', icon: MapPin },
  { name: 'Work', address: 'WTC, Echelon Square, Colombo 01', icon: MapPin },
];

// --- Reusable Sub-components ---

interface DashboardActionCardProps {
  to: string;
  icon: React.ElementType;
  title: string;
  description: string;
  bgColorClass: string;
  textColorClass: string;
}

const DashboardActionCard: React.FC<DashboardActionCardProps> = ({ to, icon: Icon, title, description, bgColorClass, textColorClass }) => (
  <Link to={to}>
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      className={`p-6 rounded-xl shadow-lg flex flex-col justify-between h-full text-white ${bgColorClass}`}
    >
      <div>
        <Icon className={`h-8 w-8 mb-3 ${textColorClass}`} />
        <h3 className="text-xl font-bold">{title}</h3>
        <p className={`mt-1 text-sm opacity-90 ${textColorClass}`}>{description}</p>
      </div>
      <div className="mt-4 flex justify-end">
        <ArrowRight className={`h-6 w-6 ${textColorClass}`} />
      </div>
    </motion.div>
  </Link>
);

const RecentRideItem: React.FC<{ ride: Partial<Ride> }> = ({ ride }) => {
    const { t } = useTranslation();
    const isUpcoming = ride.status === 'SCHEDULED';
    const date = new Date(isUpcoming ? ride.scheduled_pickup_time! : ride.completed_at!);
    
    return (
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center">
                <div className={`mr-4 p-2 rounded-full ${isUpcoming ? 'bg-blue-100 dark:bg-blue-900' : 'bg-green-100 dark:bg-green-900'}`}>
                    <History size={20} className={isUpcoming ? 'text-blue-600 dark:text-blue-300' : 'text-green-600 dark:text-green-300'} />
                </div>
                <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{ride.dropoff_location_text}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {isUpcoming ? t('dashboard.upcomingOn') : t('dashboard.completedOn')} {date.toLocaleDateString()}
                    </p>
                </div>
            </div>
            <div className="text-right">
                <p className="font-bold text-gray-900 dark:text-white">LKR {ride.final_fare?.toLocaleString()}</p>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${isUpcoming ? 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-100' : 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-100'}`}>
                    {t(`rideStatus.${ride.status}`)}
                </span>
            </div>
        </div>
    );
};

// --- Main Passenger Dashboard Component ---

const PassengerDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const userProfile = useAppSelector(selectYalurideProfile);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-4 sm:p-6 space-y-6"
    >
      {/* Welcome Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          {t('dashboard.welcome', { name: userProfile?.full_name?.split(' ')[0] || 'User' })}
        </h1>
        <p className="mt-1 text-md text-gray-600 dark:text-gray-400">
          {t('dashboard.passengerSubtitle', "Where would you like to go today?")}
        </p>
      </motion.div>

      {/* Quick Action Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DashboardActionCard
          to="/book-ride"
          icon={Car}
          title={t('dashboard.cards.bookRide.title')}
          description={t('dashboard.cards.bookRide.description')}
          bgColorClass="bg-blue-600 hover:bg-blue-700"
          textColorClass="text-blue-100"
        />
        <DashboardActionCard
          to="/post-journey"
          icon={PlusSquare}
          title={t('dashboard.cards.postJourney.title')}
          description={t('dashboard.cards.postJourney.description')}
          bgColorClass="bg-green-600 hover:bg-green-700"
          textColorClass="text-green-100"
        />
      </motion.div>

      {/* Saved Locations */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">{t('dashboard.savedLocations')}</h2>
        <div className="space-y-3">
          {mockSavedLocations.map(location => (
            <motion.div
              key={location.name}
              whileHover={{ backgroundColor: 'rgba(var(--color-accent-rgb), 0.1)' }}
              className="flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm cursor-pointer"
            >
              <location.icon className="h-5 w-5 mr-4 text-gray-500 dark:text-gray-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{location.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{location.address}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 ml-auto" />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={itemVariants}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{t('dashboard.recentActivity')}</h2>
          <Link to="/ride-history" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
            {t('common.viewAll')}
          </Link>
        </div>
        <div className="space-y-3">
          {mockRecentRides.length > 0 ? (
            mockRecentRides.map(ride => <RecentRideItem key={ride.id} ride={ride} />)
          ) : (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">{t('dashboard.noRecentActivity')}</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PassengerDashboardPage;
