import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { MapPin, Users, DollarSign, ArrowRight } from 'lucide-react';

// --- Type Definitions ---
// In a real application, these would be imported from a shared types library.
export interface SharedJourney {
  id: string;
  pickup_location_address: string;
  dropoff_location_address: string;
  max_passengers: number;
  booked_seats: number;
  price_per_seat: number;
  currency: 'LKR' | 'USD';
  departure_time: string; // ISO string
  driver_name?: string; // Optional if the driver is already assigned
  driver_avatar_url?: string; // Optional
}

interface SharedJourneyCardProps {
  journey: SharedJourney;
  onViewDetails: (journeyId: string) => void;
  onAccept: (journeyId: string) => void;
  className?: string;
}

// --- Helper Components ---

const InfoPill: React.FC<{ icon: React.ElementType; text: string | React.ReactNode; className?: string }> = ({
  icon: Icon,
  text,
  className = '',
}) => (
  <div className={`flex items-center text-xs text-gray-600 dark:text-gray-400 ${className}`}>
    <Icon className="h-4 w-4 mr-1.5 text-gray-500" />
    <span>{text}</span>
  </div>
);

const SeatProgressBar: React.FC<{ booked: number; total: number }> = ({ booked, total }) => {
  const percentage = total > 0 ? (booked / total) * 100 : 0;
  const { t } = useTranslation();

  return (
    <div>
      <div className="flex justify-between mb-1">
        <InfoPill icon={Users} text={t('marketplace.seatsBooked', { booked, total })} />
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <motion.div
          className="bg-blue-600 h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
};

// --- Main Card Component ---

export const SharedJourneyCard: React.FC<SharedJourneyCardProps> = ({
  journey,
  onViewDetails,
  onAccept,
  className = '',
}) => {
  const { t } = useTranslation();
  const seatsAvailable = journey.max_passengers - journey.booked_seats > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -5, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 transition-shadow ${className}`}
    >
      <div className="p-5">
        {/* Route Information */}
        <div className="flex items-center space-x-3">
          <div className="flex flex-col items-center">
            <MapPin className="h-5 w-5 text-blue-500" />
            <div className="h-10 w-px bg-gray-300 dark:bg-gray-600 my-1" />
            <MapPin className="h-5 w-5 text-green-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('marketplace.from')}</p>
            <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{journey.pickup_location_address}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t('marketplace.to')}</p>
            <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{journey.dropoff_location_address}</p>
          </div>
        </div>

        <div className="my-4 border-t border-gray-200 dark:border-gray-700" />

        {/* Seats and Price */}
        <div className="space-y-4">
          <SeatProgressBar booked={journey.booked_seats} total={journey.max_passengers} />
          <InfoPill
            icon={DollarSign}
            text={
              <span className="font-bold text-gray-800 dark:text-gray-200">
                {new Intl.NumberFormat('en-LK', { style: 'currency', currency: journey.currency }).format(journey.price_per_seat)}
                <span className="font-normal text-gray-500 dark:text-gray-400"> / {t('marketplace.perSeat')}</span>
              </span>
            }
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-gray-50 dark:bg-gray-800/50 px-5 py-3 flex items-center justify-between">
        <button
          onClick={() => onViewDetails(journey.id)}
          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          {t('marketplace.viewDetails')}
        </button>
        <button
          onClick={() => onAccept(journey.id)}
          disabled={!seatsAvailable}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          {t('marketplace.acceptRide')}
          <ArrowRight className="ml-2 -mr-1 h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
};
