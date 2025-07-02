import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Users, Car, ArrowRight, Sun, Moon, Briefcase, Home, DollarSign, ListFilter, Bell } from 'lucide-react';

import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { selectYalurideProfile } from '../../auth/store/slices/authSlice';
import { UserRole, Journey, Bid } from '../../../types/yaluride';
import { ToggleSwitch } from '../../../components/common/ToggleSwitch';
import { useUpdateDriverAvailabilityMutation } from '../../../services/api/driverApi'; // Assuming this exists
import { toast } from 'react-hot-toast';
import GlobalSpinner from '../../../components/common/GlobalSpinner';

// --- Mock Data (Replace with actual Redux selectors and API data) ---
const mockRecentJourneys: Partial<Journey>[] = [
  { id: 'j1', pickup_location_text: 'Colombo Fort', dropoff_location_text: 'Galle', status: 'DRIVER_ASSIGNED', departure_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'j2', pickup_location_text: 'Kandy', dropoff_location_text: 'Nuwara Eliya', status: 'COMPLETED', departure_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
];

const mockDriverStats = {
  todayEarnings: 4500,
  weekEarnings: 28500,
};

const mockIncomingRequests: (Partial<Journey> & { bidCount: number })[] = [
  { id: 'j3', pickup_location_text: 'Negombo', dropoff_location_text: 'Anuradhapura', passenger_count: 2, max_price: 8000, bidCount: 3 },
  { id: 'j4', pickup_location_text: 'Ella', dropoff_location_text: 'Arugam Bay', passenger_count: 1, max_price: 12000, bidCount: 1 },
];

// --- Reusable Sub-Components ---

const JourneyCard: React.FC<{ journey: Partial<Journey> }> = ({ journey }) => {
  const { t } = useTranslation();
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
      className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <MapPin size={14} className="mr-2" />
            <span>{journey.pickup_location_text}</span>
            <ArrowRight size={14} className="mx-2" />
            <span>{journey.dropoff_location_text}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            <Clock size={12} className="inline mr-1" />
            {new Date(journey.departure_time!).toLocaleString()}
          </p>
        </div>
        <span className={`text-xs font-bold py-1 px-2 rounded-full ${journey.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'}`}>
          {t(`journeyStatus.${journey.status}`)}
        </span>
      </div>
    </motion.div>
  );
};

const StatCard: React.FC<{ title: string; value: string; icon: React.ElementType }> = ({ title, value, icon: Icon }) => (
  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
    <div className="flex items-center">
      <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-md mr-3">
        <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  </div>
);

// --- Role-Specific Dashboards ---

const PassengerDashboard: React.FC<{ user: NonNullable<ReturnType<typeof useAppSelector<typeof selectYalurideProfile>>> }> = ({ user }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greeting.morning');
    if (hour < 18) return t('dashboard.greeting.afternoon');
    return t('dashboard.greeting.evening');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{getGreeting()}, {user.display_name}!</h1>
        <p className="text-gray-600 dark:text-gray-400">{t('dashboard.passenger.subtitle')}</p>
      </div>

      <motion.div
        onClick={() => navigate('/book-ride')}
        className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center">
          <MapPin className="h-6 w-6 text-gray-400 mr-4" />
          <span className="text-lg text-gray-500 dark:text-gray-300">{t('dashboard.passenger.whereTo')}</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button className="flex items-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
          <Home className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3" />
          <span className="font-medium text-gray-800 dark:text-gray-200">{t('dashboard.passenger.home')}</span>
        </button>
        <button className="flex items-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
          <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3" />
          <span className="font-medium text-gray-800 dark:text-gray-200">{t('dashboard.passenger.work')}</span>
        </button>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.passenger.recentJourneys')}</h2>
        <motion.div
          className="space-y-3"
          variants={{ visible: { transition: { staggerChildren: 0.1 } }, hidden: {} }}
          initial="hidden"
          animate="visible"
        >
          {mockRecentJourneys.map(journey => <JourneyCard key={journey.id} journey={journey} />)}
        </motion.div>
      </div>
    </div>
  );
};

const DriverDashboard: React.FC<{ user: NonNullable<ReturnType<typeof useAppSelector<typeof selectYalurideProfile>>> }> = ({ user }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [isAvailable, setIsAvailable] = useState(user.is_available_for_rides || false);
  const [updateAvailability, { isLoading }] = useUpdateDriverAvailabilityMutation();

  const handleAvailabilityToggle = async (checked: boolean) => {
    setIsAvailable(checked);
    try {
      await updateAvailability({ driverId: user.id, is_available: checked }).unwrap();
      toast.success(t(checked ? 'dashboard.driver.status.nowOnline' : 'dashboard.driver.status.nowOffline'));
    } catch (err) {
      toast.error(t('errors.updateFailed'));
      setIsAvailable(!checked); // Revert on failure
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('dashboard.driver.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('dashboard.driver.subtitle')}</p>
        </div>
        <div className="flex items-center space-x-3">
            <span className={`text-sm font-medium ${isAvailable ? 'text-green-600' : 'text-gray-500'}`}>
                {t(isAvailable ? 'dashboard.driver.status.online' : 'dashboard.driver.status.offline')}
            </span>
            <ToggleSwitch checked={isAvailable} onChange={handleAvailabilityToggle} disabled={isLoading} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard title={t('dashboard.driver.earnings.today')} value={`LKR ${mockDriverStats.todayEarnings.toLocaleString()}`} icon={DollarSign} />
        <StatCard title={t('dashboard.driver.earnings.thisWeek')} value={`LKR ${mockDriverStats.weekEarnings.toLocaleString()}`} icon={DollarSign} />
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('dashboard.driver.incomingRequests')}</h2>
          <button className="flex items-center text-sm font-medium text-blue-600 hover:underline">
            <ListFilter size={16} className="mr-1" />
            {t('common.filter')}
          </button>
        </div>
        <div className="space-y-3">
          {mockIncomingRequests.map(request => (
            <motion.div
              key={request.id}
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm"
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                <div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <MapPin size={14} className="mr-2" />
                    <span>{request.pickup_location_text}</span>
                    <ArrowRight size={14} className="mx-2" />
                    <span>{request.dropoff_location_text}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                    <span className="flex items-center"><Users size={12} className="mr-1" /> {request.passenger_count}</span>
                    <span className="flex items-center"><DollarSign size={12} className="mr-1" /> Max Price: LKR {request.max_price?.toLocaleString()}</span>
                  </div>
                </div>
                <div className="mt-3 sm:mt-0">
                  <button onClick={() => navigate(`/journeys/${request.id}/bids`)} className="btn-primary-sm w-full sm:w-auto">
                    {t('dashboard.driver.viewAndBid', { count: request.bidCount })}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Main Dashboard Page ---
const DashboardPage: React.FC = () => {
  const userProfile = useAppSelector(selectYalurideProfile);

  if (!userProfile) {
    // This should ideally be handled by a ProtectedRoute component,
    // but as a fallback, we can show a spinner.
    return <GlobalSpinner message="Loading Dashboard..." />;
  }

  const isDriver = userProfile.role === UserRole.DRIVER || userProfile.role === UserRole.BOTH;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-4 sm:p-6 lg:p-8"
    >
      {isDriver ? <DriverDashboard user={userProfile} /> : <PassengerDashboard user={userProfile} />}
    </motion.div>
  );
};

export default DashboardPage;
