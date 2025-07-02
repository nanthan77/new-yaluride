import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Car, Calendar, CheckCircle, Clock, Star, TrendingUp, MoreVertical, Trash2, MessageSquare } from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';

// --- Types (should be imported from a central types file) ---
enum RideStatus {
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  SCHEDULED = 'SCHEDULED',
  UPCOMING = 'UPCOMING',
}

interface Ride {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  timestamp: string;
  fare: number;
  status: RideStatus;
  driverName?: string;
  driverAvatar?: string;
  rating?: number;
}

// --- Mock Data (replace with Redux selectors) ---
const useMockRideHistory = () => {
  const completedRides: Ride[] = [
    { id: 'ride1', pickupAddress: 'One Galle Face Mall, Colombo', dropoffAddress: 'Galle Fort, Galle', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), fare: 12500.00, status: RideStatus.COMPLETED, driverName: 'Suresh Perera', driverAvatar: 'https://i.pravatar.cc/150?u=driver1', rating: 5 },
    { id: 'ride2', pickupAddress: 'Kandy City Centre, Kandy', dropoffAddress: 'Temple of the Tooth Relic, Kandy', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), fare: 350.50, status: RideStatus.COMPLETED, driverName: 'Ravi Fernando', driverAvatar: 'https://i.pravatar.cc/150?u=driver2', rating: 4 },
    { id: 'ride3', pickupAddress: 'Jaffna Public Library, Jaffna', dropoffAddress: 'Nallur Kandaswamy Kovil, Jaffna', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), fare: 200.00, status: RideStatus.CANCELLED, driverName: 'Mani Kumar', driverAvatar: 'https://i.pravatar.cc/150?u=driver3' },
  ];

  const upcomingRides: Ride[] = [
    { id: 'ride4', pickupAddress: 'Bandaranaike International Airport', dropoffAddress: 'Cinnamon Grand Hotel, Colombo', timestamp: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), fare: 4500.00, status: RideStatus.SCHEDULED, driverName: 'Kamal Silva', driverAvatar: 'https://i.pravatar.cc/150?u=driver4' },
  ];

  return { completedRides, upcomingRides, isLoading: false, error: null };
};

// --- Helper Functions ---
const formatCurrency = (amount: number, currency = 'LKR') => {
    return new Intl.NumberFormat('en-LK', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};


// --- Sub-Components ---
const RideCard: React.FC<{ ride: Ride }> = ({ ride }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const statusInfo = useMemo(() => {
        switch (ride.status) {
            case RideStatus.COMPLETED: return { text: t('rideStatus.completed'), color: 'text-green-600 dark:text-green-400', icon: <CheckCircle size={16} /> };
            case RideStatus.CANCELLED: return { text: t('rideStatus.cancelled'), color: 'text-red-600 dark:text-red-400', icon: <XCircle size={16} /> };
            case RideStatus.SCHEDULED:
            case RideStatus.UPCOMING:
            default: return { text: t('rideStatus.scheduled'), color: 'text-blue-600 dark:text-blue-400', icon: <Clock size={16} /> };
        }
    }, [ride.status, t]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
        >
            <div className="flex justify-between items-start">
                <div className="flex-grow">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(ride.timestamp)} - {formatTime(ride.timestamp)}</p>
                    <div className="flex items-center mt-2">
                        <Car size={20} className="text-gray-400 mr-3" />
                        <div>
                            <p className="font-medium text-sm text-gray-800 dark:text-gray-100 truncate">{ride.pickupAddress}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">to</p>
                            <p className="font-medium text-sm text-gray-800 dark:text-gray-100 truncate">{ride.dropoffAddress}</p>
                        </div>
                    </div>
                </div>
                <div className="text-right ml-4 flex-shrink-0">
                    <p className="font-bold text-lg text-gray-900 dark:text-white">{formatCurrency(ride.fare)}</p>
                    <div className={`flex items-center justify-end text-xs font-medium mt-1 ${statusInfo.color}`}>
                        {statusInfo.icon}
                        <span className="ml-1.5">{statusInfo.text}</span>
                    </div>
                </div>
            </div>
            {(ride.status === RideStatus.COMPLETED || ride.status === RideStatus.CANCELLED) && ride.driverName && (
                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <div className="flex items-center">
                        <img src={ride.driverAvatar} alt={ride.driverName} className="h-8 w-8 rounded-full object-cover mr-2" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">{t('rideHistory.withDriver', { name: ride.driverName })}</span>
                    </div>
                    {ride.rating && (
                        <div className="flex items-center text-sm text-yellow-500">
                            <Star size={16} className="fill-current mr-1" />
                            <span>{ride.rating.toFixed(1)}</span>
                        </div>
                    )}
                </div>
            )}
             <div className="mt-3 flex justify-end">
                <Menu as="div" className="relative inline-block text-left">
                    <Menu.Button className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-blue-500">
                        <MoreVertical size={18} />
                    </Menu.Button>
                    <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                        <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right divide-y divide-gray-100 dark:divide-gray-700 rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black/5 focus:outline-none z-10">
                            <div className="px-1 py-1">
                                <Menu.Item>
                                    {({ active }) => (<button className={`${active ? 'bg-blue-500 text-white' : 'text-gray-900 dark:text-gray-100'} group flex w-full items-center rounded-md px-2 py-2 text-sm`} onClick={() => navigate(`/ride/${ride.id}`)}><TrendingUp className="mr-2 h-5 w-5" />{t('rideHistory.actions.viewDetails')}</button>)}
                                </Menu.Item>
                                {ride.status === RideStatus.COMPLETED && !ride.rating && (
                                    <Menu.Item>
                                        {({ active }) => (<button className={`${active ? 'bg-blue-500 text-white' : 'text-gray-900 dark:text-gray-100'} group flex w-full items-center rounded-md px-2 py-2 text-sm`} onClick={() => toast.success('Rate Ride modal would open.')}><Star className="mr-2 h-5 w-5" />{t('rideHistory.actions.rateRide')}</button>)}
                                    </Menu.Item>
                                )}
                                <Menu.Item>
                                    {({ active }) => (<button className={`${active ? 'bg-blue-500 text-white' : 'text-gray-900 dark:text-gray-100'} group flex w-full items-center rounded-md px-2 py-2 text-sm`} onClick={() => toast.success('Help modal would open.')}><MessageSquare className="mr-2 h-5 w-5" />{t('rideHistory.actions.getHelp')}</button>)}
                                </Menu.Item>
                            </div>
                            {ride.status === RideStatus.SCHEDULED && (
                                <div className="px-1 py-1">
                                    <Menu.Item>
                                        {({ active }) => (<button className={`${active ? 'bg-red-500 text-white' : 'text-red-600 dark:text-red-400'} group flex w-full items-center rounded-md px-2 py-2 text-sm`} onClick={() => toast.error('Ride cancelled.')}><Trash2 className="mr-2 h-5 w-5" />{t('rideHistory.actions.cancelRide')}</button>)}
                                    </Menu.Item>
                                </div>
                            )}
                        </Menu.Items>
                    </Transition>
                </Menu>
            </div>
        </motion.div>
    );
};

// --- Main Page Component ---
const RideHistoryPage: React.FC = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'completed' | 'upcoming'>('completed');
    const { completedRides, upcomingRides, isLoading, error } = useMockRideHistory();

    const tabs = [
        { id: 'completed', label: t('rideHistory.tabs.completed'), icon: CheckCircle },
        { id: 'upcoming', label: t('rideHistory.tabs.upcoming'), icon: Calendar },
    ];

    const currentRides = activeTab === 'completed' ? completedRides : upcomingRides;

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center mb-8">
                    <History className="mr-3 h-8 w-8 text-blue-600 dark:text-blue-400" />
                    {t('rideHistory.title')}
                </h1>
            </motion.div>

            <div>
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                                    ${activeTab === tab.id
                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
                                    }`}
                            >
                                <tab.icon className={`-ml-0.5 mr-2 h-5 w-5 ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="mt-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -10, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            {isLoading ? (
                                <div className="flex justify-center items-center h-48">
                                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                </div>
                            ) : error ? (
                                <div className="text-center py-10 text-red-500">
                                    <p>{t('errors.failedToLoadHistory')}</p>
                                    <p className="text-sm">{error}</p>
                                </div>
                            ) : currentRides.length > 0 ? (
                                <div className="space-y-4">
                                    {currentRides.map(ride => <RideCard key={ride.id} ride={ride} />)}
                                </div>
                            ) : (
                                <div className="text-center py-16 px-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <Car size={48} className="mx-auto text-gray-400 dark:text-gray-500" />
                                    <p className="mt-4 font-medium text-gray-700 dark:text-gray-300">
                                        {activeTab === 'completed' ? t('rideHistory.noCompletedRides') : t('rideHistory.noUpcomingRides')}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('rideHistory.bookNowPrompt')}</p>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default RideHistoryPage;
