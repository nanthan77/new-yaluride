import React, { useState, useMemo, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { MapPin, Calendar, Users, Briefcase, Car, DollarSign, ArrowDownUp, Search, X, Loader2, Send } from 'lucide-react';

// --- Type Definitions (should be in a shared types file) ---
export enum VehicleType {
  CAR = 'CAR',
  VAN = 'VAN',
  TUKTUK = 'TUKTUK',
  SUV = 'SUV',
  BIKE = 'BIKE',
}

export enum LuggageSize {
    NONE = 'NONE',
    SMALL = 'SMALL',
    MEDIUM = 'MEDIUM',
    LARGE = 'LARGE',
}

export interface Journey {
  id: string;
  passengerName: string;
  passengerAvatarUrl?: string;
  pickupAddress: string;
  destinationAddress: string;
  scheduledAt: string; // ISO string
  passengerCount: number;
  luggageDetails: LuggageSize;
  vehicleTypes: VehicleType[];
  maxPrice?: number;
  currency: 'LKR' | 'USD';
  specialRequests?: string;
}

type SortOption = 'newest' | 'oldest' | 'price_high' | 'price_low';

interface BidFormValues {
  bidAmount: number;
  message?: string;
}

// --- Zod Validation Schema for the Bid Modal ---
const bidSchema = z.object({
  bidAmount: z.number({ required_error: 'Bid amount is required.' }).positive({ message: 'Bid must be a positive number.' }),
  message: z.string().max(250, { message: 'Message cannot exceed 250 characters.' }).optional(),
});

// --- Mock API Hooks (to be replaced with actual RTK Query hooks) ---
const useGetAvailableJourneysQuery = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [data, setData] = useState<Journey[] | undefined>(undefined);

    useEffect(() => {
        const MOCK_JOURNEYS: Journey[] = [
            { id: 'journey-1', passengerName: 'Nimali Perera', pickupAddress: 'Galle Fort, Galle', destinationAddress: 'Ella Rock, Ella', scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), passengerCount: 2, luggageDetails: LuggageSize.MEDIUM, vehicleTypes: [VehicleType.CAR, VehicleType.VAN], maxPrice: 15000, currency: 'LKR', specialRequests: 'Need space for a surfboard.' },
            { id: 'journey-2', passengerName: 'Ravi Kumar', pickupAddress: 'Bandaranaike International Airport (CMB)', destinationAddress: 'Arugam Bay', scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), passengerCount: 1, luggageDetails: LuggageSize.SMALL, vehicleTypes: [VehicleType.CAR], maxPrice: 25000, currency: 'LKR' },
            { id: 'journey-3', passengerName: 'Sarah Johnson', pickupAddress: 'Mirissa Beach', destinationAddress: 'Udawalawe National Park', scheduledAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), passengerCount: 4, luggageDetails: LuggageSize.LARGE, vehicleTypes: [VehicleType.VAN, VehicleType.SUV], currency: 'USD', maxPrice: 120 },
            { id: 'journey-4', passengerName: 'Fathima Rizvi', pickupAddress: 'Kandy City Center', destinationAddress: 'Nuwara Eliya', scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), passengerCount: 2, luggageDetails: LuggageSize.NONE, vehicleTypes: [VehicleType.TUKTUK, VehicleType.CAR], currency: 'LKR' },
        ];
        const timer = setTimeout(() => {
            // To test error state: setIsError(true);
            setData(MOCK_JOURNEYS);
            setIsLoading(false);
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    return { data, isLoading, isError, refetch: () => {} };
};

const useSubmitBidMutation = () => {
    const [isLoading, setIsLoading] = useState(false);
    const mutate = async (data: { journeyId: string; bid: BidFormValues }) => {
        setIsLoading(true);
        console.log('Submitting bid:', data);
        await new Promise(resolve => setTimeout(resolve, 1500));
        // To test error: throw new Error("Failed to submit bid.");
        setIsLoading(false);
        return { success: true };
    };
    return [mutate, { isLoading }] as const;
};

// --- Sub-components ---

const FilterBar: React.FC<{
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortOption: SortOption;
  setSortOption: (option: SortOption) => void;
}> = ({ searchQuery, setSearchQuery, sortOption, setSortOption }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6">
      <div className="relative flex-grow">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder={t('marketplace.driver.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="form-input w-full pl-10"
        />
      </div>
      <div className="relative">
        <ArrowDownUp className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value as SortOption)}
          className="form-select w-full md:w-auto pl-10"
        >
          <option value="newest">{t('marketplace.driver.sort.newest')}</option>
          <option value="oldest">{t('marketplace.driver.sort.oldest')}</option>
          <option value="price_high">{t('marketplace.driver.sort.priceHigh')}</option>
          <option value="price_low">{t('marketplace.driver.sort.priceLow')}</option>
        </select>
      </div>
    </div>
  );
};

const JourneyCard: React.FC<{ journey: Journey; onBid: (journey: Journey) => void }> = ({ journey, onBid }) => {
    const { t } = useTranslation();
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 border border-gray-200 dark:border-gray-700 flex flex-col"
        >
            <div className="flex items-start justify-between">
                <div className="flex items-center">
                    <img src={journey.passengerAvatarUrl || `https://i.pravatar.cc/150?u=${journey.passengerName}`} alt={journey.passengerName} className="h-10 w-10 rounded-full mr-3" />
                    <div>
                        <p className="font-semibold text-gray-800 dark:text-white">{journey.passengerName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('marketplace.driver.postedBy')}</p>
                    </div>
                </div>
                {journey.maxPrice && (
                    <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('marketplace.driver.maxBudget')}</p>
                        <p className="font-bold text-lg text-green-600 dark:text-green-400">{journey.currency} {journey.maxPrice.toLocaleString()}</p>
                    </div>
                )}
            </div>
            <div className="my-4 space-y-3">
                <div className="flex items-start">
                    <MapPin size={16} className="text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-semibold">{t('common.from')}:</span> {journey.pickupAddress}</p>
                </div>
                <div className="flex items-start">
                    <MapPin size={16} className="text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-semibold">{t('common.to')}:</span> {journey.destinationAddress}</p>
                </div>
            </div>
            <div className="flex-grow" />
            <div className="mt-2 pt-3 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-center">
                <div className="flex flex-col items-center"><Calendar size={16} className="mb-1 text-gray-500" /><span>{new Date(journey.scheduledAt).toLocaleDateString()}</span></div>
                <div className="flex flex-col items-center"><Users size={16} className="mb-1 text-gray-500" /><span>{t('marketplace.driver.passengers', { count: journey.passengerCount })}</span></div>
                <div className="flex flex-col items-center"><Briefcase size={16} className="mb-1 text-gray-500" /><span>{t(`luggage.${journey.luggageDetails.toLowerCase()}` as const)}</span></div>
                <div className="flex flex-col items-center"><Car size={16} className="mb-1 text-gray-500" /><span>{journey.vehicleTypes.map(v => t(`vehicleTypes.${v.toLowerCase()}` as const)).join(', ')}</span></div>
            </div>
            <button onClick={() => onBid(journey)} className="btn-primary w-full mt-4">
                {t('marketplace.driver.bidNow')}
            </button>
        </motion.div>
    );
};

const BidModal: React.FC<{
  journey: Journey | null;
  isOpen: boolean;
  onClose: () => void;
}> = ({ journey, isOpen, onClose }) => {
  const { t } = useTranslation();
  const [submitBid, { isLoading }] = useSubmitBidMutation();
  const { register, handleSubmit, formState: { errors }, reset } = useForm<BidFormValues>({
    resolver: zodResolver(bidSchema),
  });

  useEffect(() => {
    if (!isOpen) {
      reset({ bidAmount: undefined, message: '' });
    }
  }, [isOpen, reset]);

  const onSubmit: SubmitHandler<BidFormValues> = async (data) => {
    if (!journey) return;
    try {
      await submitBid({ journeyId: journey.id, bid: data });
      toast.success(t('marketplace.driver.bidSuccessToast'));
      onClose();
    } catch (error: any) {
      toast.error(t('marketplace.driver.bidErrorToast', { message: error.message }));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && journey && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('marketplace.driver.bidModal.title')}</h2>
              <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{t('marketplace.driver.bidModal.subtitle', { passenger: journey.passengerName })}</p>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="bidAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('marketplace.driver.bidModal.bidAmountLabel')}</label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="bidAmount"
                    type="number"
                    {...register('bidAmount', { valueAsNumber: true })}
                    placeholder={journey.maxPrice ? `e.g., ${journey.maxPrice}` : '10000'}
                    className={`form-input w-full pl-10 ${errors.bidAmount ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.bidAmount && <p className="mt-1 text-xs text-red-500">{errors.bidAmount.message}</p>}
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('marketplace.driver.bidModal.messageLabel')}</label>
                <textarea
                  id="message"
                  {...register('message')}
                  rows={3}
                  placeholder={t('marketplace.driver.bidModal.messagePlaceholder')}
                  className="form-textarea w-full mt-1"
                />
                {errors.message && <p className="mt-1 text-xs text-red-500">{errors.message.message}</p>}
              </div>
              <div className="flex justify-end pt-4">
                <button type="submit" disabled={isLoading} className="btn-primary flex items-center">
                  {isLoading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Send className="h-5 w-5 mr-2" />}
                  {isLoading ? t('common.submitting') : t('marketplace.driver.bidModal.submitButton')}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// --- Main Marketplace Component ---
const DriverMarketplace: React.FC = () => {
  const { t } = useTranslation();
  const { data: journeys, isLoading, isError } = useGetAvailableJourneysQuery();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null);

  const filteredAndSortedJourneys = useMemo(() => {
    if (!journeys) return [];

    const filtered = journeys.filter(j =>
      j.pickupAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.destinationAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.passengerName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return filtered.sort((a, b) => {
      switch (sortOption) {
        case 'newest':
          return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime();
        case 'oldest':
          return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
        case 'price_high':
          return (b.maxPrice || 0) - (a.maxPrice || 0);
        case 'price_low':
          return (a.maxPrice || 0) - (b.maxPrice || 0);
        default:
          return 0;
      }
    });
  }, [journeys, searchQuery, sortOption]);

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex justify-center items-center py-20"><Loader2 className="h-12 w-12 animate-spin text-blue-600" /></div>;
    }
    if (isError) {
      return (
        <div className="text-center py-20 text-red-600">
          <AlertTriangle className="mx-auto h-12 w-12" />
          <p className="mt-4 font-semibold">{t('common.error.fetchFailed')}</p>
        </div>
      );
    }
    if (filteredAndSortedJourneys.length === 0) {
      return (
        <div className="text-center py-20">
          <Search className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">{t('marketplace.driver.emptyState.title')}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('marketplace.driver.emptyState.subtitle')}</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredAndSortedJourneys.map(journey => (
            <JourneyCard key={journey.id} journey={journey} onBid={() => setSelectedJourney(journey)} />
          ))}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('marketplace.driver.title')}</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">{t('marketplace.driver.subtitle')}</p>
      <FilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortOption={sortOption}
        setSortOption={setSortOption}
      />
      {renderContent()}
      <BidModal
        isOpen={!!selectedJourney}
        journey={selectedJourney}
        onClose={() => setSelectedJourney(null)}
      />
    </div>
  );
};

export default DriverMarketplace;
