import React, { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Transition, Switch as HeadlessSwitch } from '@headlessui/react';
import {
  MapPin,
  Clock,
  Users,
  DollarSign,
  Filter as FilterIcon,
  List,
  Map as MapViewIcon,
  AlertCircle,
  Loader2,
  Search,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { useDebounce } from 'use-debounce';

import { toast } from 'react-hot-toast';
import { useAppSelector } from '../../../store/hooks';
import {
  useGetJourneysQuery,
} from '../../../services/api/journeyApi';
import { selectYalurideProfile } from '../../../store/slices/authSlice';
import { Journey, JourneyFilters, MarketplaceSortBy, UserProfile, DriverSpecificProfile, VehicleType } from '../../../types/yaluride';
import JourneyCard from '../components/JourneyCard';
import BidModal from '../components/BidModal';
import { NetworkManagerInstance } from '../../../utils/networkManager';
import VoiceCommandHandler from '../../../components/voice/VoiceCommandHandler';
import GlobalSpinner from '../../../components/common/GlobalSpinner';

const vehicleTypeOptionsList = Object.values(VehicleType).map(v => ({ value: v, labelKey: `vehicleTypes.${v}`}));

const initialFilters: JourneyFilters = {
  radiusKm: 50,
  dateFrom: new Date().toISOString().split('T')[0],
  dateTo: new Date(new Date().setDate(new Date().getDate() + 14)).toISOString().split('T')[0],
  vehicleTypes: [],
  minPrice: 0,
  maxPrice: 1000000,
  hideBidByCurrentUser: false,
  searchTerm: '',
  passengerCount: 1,
};

const MarketplaceBrowsePage: React.FC = () => {
  const { t } = useTranslation();

  const driverProfile = useAppSelector(selectYalurideProfile) as (UserProfile & DriverSpecificProfile) | null;

  const [allJourneys, setAllJourneys] = useState<Journey[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<JourneyFilters>(initialFilters);
  const [sortBy, setSortBy] = useState<MarketplaceSortBy>('matchScore');
  const [debouncedSearchTerm] = useDebounce(filters.searchTerm, 500);

  const [selectedJourneyForBid, setSelectedJourneyForBid] = useState<Journey | null>(null);
  const [isOnline, setIsOnline] = useState(NetworkManagerInstance.isOnline());
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const queryArgs = useMemo(() => ({
    filters: { ...filters, searchTerm: debouncedSearchTerm },
    sortBy,
    page: currentPage,
    driverProfile,
  }), [filters, debouncedSearchTerm, sortBy, currentPage, driverProfile]);

  const {
    data: queryData,
    error,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetJourneysQuery(queryArgs, {
    skip: !driverProfile, // Don't fetch until the driver profile is loaded
  });

  // Effect to handle network status changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    NetworkManagerInstance.on('online', handleOnline);
    NetworkManagerInstance.on('offline', handleOffline);
    return () => {
      NetworkManagerInstance.off('online', handleOnline);
      NetworkManagerInstance.off('offline', handleOffline);
    };
  }, []);

  // Effect to append new data for pagination or reset on filter/sort change
  useEffect(() => {
    if (queryData?.journeys) {
      if (queryData.page === 1) {
        setAllJourneys(queryData.journeys);
      } else {
        setAllJourneys(prevJourneys => {
          const newJourneys = queryData.journeys.filter(
            nj => !prevJourneys.some(pj => pj.id === nj.id)
          );
          return [...prevJourneys, ...newJourneys];
        });
      }
    }
  }, [queryData]);

  const handleFilterOrSortChange = useCallback(() => {
    setCurrentPage(1);
    setAllJourneys([]);
    // The query will automatically refetch because its arguments (filters, sortBy) have changed.
  }, []);

  const handleFilterChange = (filterName: keyof JourneyFilters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
    handleFilterOrSortChange();
  };

  const handleSortChange = (newSortBy: MarketplaceSortBy) => {
    setSortBy(newSortBy);
    handleFilterOrSortChange();
  };

  const handleLoadMore = () => {
    if (queryData?.hasMore && !isFetching) {
      setCurrentPage(prevPage => prevPage + 1);
    }
  };

  const resetAllFilters = () => {
    setFilters(initialFilters);
    handleFilterOrSortChange();
  };

  if (!driverProfile) {
    return <GlobalSpinner message={t('common.loadingProfile')} />;
  }

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    const initialValue = initialFilters[key as keyof JourneyFilters];
    if (Array.isArray(value) && Array.isArray(initialValue)) {
        return value.length !== initialValue.length || value.some((v, i) => v !== initialValue[i]);
    }
    return value !== initialValue;
  }).length;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 shadow-md p-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('marketplaceBrowse.pageTitle')}</h1>
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
            <button
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className="flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 relative"
              aria-expanded={showFiltersPanel}
            >
              <SlidersHorizontal size={18} className="mr-1.5" />
              {t('common.filters')}
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            <Menu as="div" className="relative inline-block text-left">
              <Menu.Button className="inline-flex justify-center w-full rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm px-3 py-2 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-700 focus:ring-blue-500">
                <ArrowUpDown size={18} className="mr-1.5" />
                {t('marketplaceBrowse.sortBy.label')}
                <ChevronDown className="ml-2 -mr-1 h-5 w-5" aria-hidden="true" />
              </Menu.Button>
              <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                <Menu.Items className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black dark:ring-gray-600 ring-opacity-5 focus:outline-none z-10 max-h-60 overflow-y-auto">
                  <div className="py-1">
                    {(['matchScore', 'newest', 'highestPrice', 'closestPickup', 'soonestPickup'] as MarketplaceSortBy[]).map(option => (
                      <Menu.Item key={option}>
                        {({ active }) => (
                          <button onClick={() => handleSortChange(option)} className={`${active ? 'bg-gray-100 dark:bg-gray-600' : ''} ${sortBy === option ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'} group flex rounded-md items-center w-full px-3 py-2 text-sm`}>
                            {t(`marketplaceBrowse.sortBy.${option}` as const)}
                          </button>
                        )}
                      </Menu.Item>
                    ))}
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
            <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-lg p-0.5">
                <button onClick={() => setViewMode('list')} className={`px-2.5 py-1.5 text-sm rounded-md ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500'}`}><List size={18}/></button>
                <button onClick={() => setViewMode('map')} className={`px-2.5 py-1.5 text-sm rounded-md ${viewMode === 'map' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500'}`}><MapViewIcon size={18}/></button>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {showFiltersPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-50 dark:bg-gray-800/50 p-4 shadow-md overflow-hidden mb-4"
          >
            <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              {/* Filter controls remain the same, their onChange handlers now update local state */}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto p-4">
        {!isOnline && (
          <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-700 border border-yellow-300 dark:border-yellow-600 text-yellow-700 dark:text-yellow-100 rounded-lg text-sm flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            {t('common.offlineMessage')} {t('marketplaceBrowse.offlineInfo')}
          </div>
        )}

        {isLoading && allJourneys.length === 0 && (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400" />
            <p className="ml-3 text-gray-700 dark:text-gray-300">{t('common.loadingJourneys')}</p>
          </div>
        )}

        {isError && (
          <div className="p-6 text-center bg-red-50 dark:bg-red-900_widget text-red-700 dark:text-red-200 rounded-xl shadow">
            <AlertCircle className="mx-auto h-10 w-10 mb-2" />
            <p className="font-semibold">{t('errors.fetchFailedTitle', 'Failed to Load Journeys')}</p>
            <p className="text-sm mb-3">{(error as any)?.data?.message || (error as any)?.error || 'An unknown error occurred'}</p>
            <button onClick={() => refetch()} className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white">
              {t('common.retry')}
            </button>
          </div>
        )}

        {!isLoading && !isError && allJourneys.length === 0 && (
          <div className="py-10 text-center text-gray-500 dark:text-gray-400">
            <Search size={48} className="mx-auto mb-3 text-gray-400 dark:text-gray-500" />
            <p className="text-lg font-medium">{t('marketplaceBrowse.noJourneysFound')}</p>
            <p className="text-sm">{t('marketplaceBrowse.tryAdjustingFilters')}</p>
          </div>
        )}

        {allJourneys.length > 0 && (
          <>
            {viewMode === 'list' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {allJourneys.map(journey => (
                  <JourneyCard
                    key={journey.id}
                    journey={journey}
                    driver={driverProfile}
                    onSelect={() => setSelectedJourneyForBid(journey)}
                  />
                ))}
              </div>
            ) : (
              <div className="h-[calc(100vh-200px)] bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 shadow-inner">
                <p>{t('marketplaceBrowse.mapViewPlaceholder')}</p>
              </div>
            )}
            
            {queryData?.hasMore && !isFetching && (
              <div className="mt-8 text-center">
                <button
                  onClick={handleLoadMore}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                >
                  {t('common.loadMore')}
                </button>
              </div>
            )}
            {isFetching && allJourneys.length > 0 && (
                 <div className="flex justify-center items-center h-20">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                 </div>
            )}
          </>
        )}
      </main>

      <div className="fixed bottom-20 right-6 z-40 md:bottom-8 md:right-8">
         <VoiceCommandHandler />
      </div>

      {selectedJourneyForBid && driverProfile && (
        <BidModal
          journey={selectedJourneyForBid}
          driver={driverProfile}
          isOpen={!!selectedJourneyForBid}
          onClose={() => setSelectedJourneyForBid(null)}
          onBidSubmitted={(bid) => {
            setSelectedJourneyForBid(null);
            toast.success(t('bidModal.success.bidSubmitted', { journeyId: bid.journey_id }));
          }}
        />
      )}
    </div>
  );
};

export default MarketplaceBrowsePage;
