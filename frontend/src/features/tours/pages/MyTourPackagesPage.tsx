import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Send,
  FileText,
  User,
  Archive,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// --- Type Definitions (should be in a shared types file) ---
export enum BookingStatus {
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED_BY_USER = 'CANCELLED_BY_USER',
  PENDING_CONFIRMATION = 'PENDING_CONFIRMATION',
}

interface BookedTour {
  bookingId: string;
  packageId: string;
  packageName: string;
  startDate: string; // ISO string
  status: BookingStatus;
  totalPaid: number;
  currency: string;
  driver: {
    name: string;
    profilePictureUrl?: string;
  };
}

// --- Mock API Hook ---
// In a real app, this would be an RTK Query hook.
const useGetMyBookedToursQuery = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [data, setData] = useState<BookedTour[] | undefined>(undefined);

  React.useEffect(() => {
    const MOCK_BOOKED_TOURS: BookedTour[] = [
      {
        bookingId: 'booking-1',
        packageId: 'pkg-1',
        packageName: 'Kandy Cultural Triangle & Tea Country Tour',
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
        status: BookingStatus.CONFIRMED,
        totalPaid: 85000,
        currency: 'LKR',
        driver: { name: 'Saman Kumara', profilePictureUrl: 'https://i.pravatar.cc/150?u=driver-1' },
      },
      {
        bookingId: 'booking-2',
        packageId: 'pkg-4',
        packageName: 'Jaffna Peninsula Explorer',
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 1 month from now
        status: BookingStatus.CONFIRMED,
        totalPaid: 95000,
        currency: 'LKR',
        driver: { name: 'Ravi Fernando', profilePictureUrl: 'https://i.pravatar.cc/150?u=driver-4' },
      },
      {
        bookingId: 'booking-3',
        packageId: 'pkg-2',
        packageName: 'Southern Coast Beach Hopping',
        startDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days ago
        status: BookingStatus.COMPLETED,
        totalPaid: 450000,
        currency: 'LKR',
        driver: { name: 'Kasun Perera', profilePictureUrl: 'https://i.pravatar.cc/150?u=driver-2' },
      },
      {
        bookingId: 'booking-4',
        packageId: 'pkg-3',
        packageName: 'Ella & Hill Country Adventure',
        startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
        status: BookingStatus.CANCELLED_BY_USER,
        totalPaid: 0,
        currency: 'LKR',
        driver: { name: 'Nimal Silva', profilePictureUrl: 'https://i.pravatar.cc/150?u=driver-3' },
      },
    ];

    const timer = setTimeout(() => {
      setData(MOCK_BOOKED_TOURS);
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return { data, isLoading, isError, refetch: () => {} };
};

// --- Sub-components ---

const StatusBadge: React.FC<{ status: BookingStatus }> = ({ status }) => {
  const { t } = useTranslation();
  const statusStyles = {
    [BookingStatus.CONFIRMED]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    [BookingStatus.COMPLETED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    [BookingStatus.CANCELLED_BY_USER]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    [BookingStatus.PENDING_CONFIRMATION]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  };
  const statusIcons = {
    [BookingStatus.CONFIRMED]: <Calendar size={12} className="mr-1.5" />,
    [BookingStatus.COMPLETED]: <CheckCircle size={12} className="mr-1.5" />,
    [BookingStatus.CANCELLED_BY_USER]: <XCircle size={12} className="mr-1.5" />,
    [BookingStatus.PENDING_CONFIRMATION]: <Loader2 size={12} className="mr-1.5 animate-spin" />,
  };
  return (
    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[status]}`}>
      {statusIcons[status]}
      {t(`tours.bookingStatus.${status}`)}
    </span>
  );
};

const BookingCard: React.FC<{ booking: BookedTour; onCancel: (bookingId: string) => void }> = ({ booking, onCancel }) => {
  const { t } = useTranslation();
  const isUpcoming = new Date(booking.startDate) > new Date() && booking.status === BookingStatus.CONFIRMED;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 border border-gray-200 dark:border-gray-700"
    >
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <StatusBadge status={booking.status} />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-2">{booking.packageName}</h3>
          <div className="mt-2 space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center">
              <User size={14} className="mr-2" />
              <span>{t('tours.booked.driver')}: {booking.driver.name}</span>
            </div>
            <div className="flex items-center">
              <Calendar size={14} className="mr-2" />
              <span>{t('tours.booked.startDate')}: {new Date(booking.startDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="text-left sm:text-right flex-shrink-0">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('tours.booked.totalPaid')}</p>
          <p className="text-xl font-bold text-gray-800 dark:text-white">{booking.currency} {booking.totalPaid.toLocaleString()}</p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-2 justify-end">
        <Link to={`/tours/${booking.packageId}`} className="btn-secondary-sm">
          <FileText size={16} className="mr-2" />
          {t('tours.booked.viewDetails')}
        </Link>
        <button className="btn-secondary-sm">
          <Send size={16} className="mr-2" />
          {t('tours.booked.contactDriver')}
        </button>
        {isUpcoming && (
          <button onClick={() => onCancel(booking.bookingId)} className="btn-danger-sm">
            <XCircle size={16} className="mr-2" />
            {t('tours.booked.cancelBooking')}
          </button>
        )}
      </div>
    </motion.div>
  );
};

const MyBookedToursPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: bookings, isLoading, isError, refetch } = useGetMyBookedToursQuery();

  const handleCancelBooking = (bookingId: string) => {
    toast((toastInstance) => (
        <div className="flex flex-col items-center p-2">
          <p className="font-semibold text-center">{t('tours.cancelConfirm.title')}</p>
          <p className="text-sm text-center mt-1">{t('tours.cancelConfirm.message')}</p>
          <div className="mt-4 flex w-full space-x-2">
            <button onClick={() => toast.dismiss(toastInstance.id)} className="btn-secondary w-full">
              {t('common.no')}
            </button>
            <button
              onClick={() => {
                console.log(`Cancelling booking ${bookingId}`);
                toast.dismiss(toastInstance.id);
                toast.success(t('tours.cancelConfirm.success'));
                // In a real app: dispatch(cancelBooking(bookingId));
              }}
              className="btn-danger w-full"
            >
              {t('common.yes')}
            </button>
          </div>
        </div>
      ), { duration: 10000 });
  };

  const { upcomingBookings, pastBookings } = useMemo(() => {
    if (!bookings) return { upcomingBookings: [], pastBookings: [] };
    const now = new Date();
    const upcoming = bookings.filter(b => new Date(b.startDate) >= now && b.status !== BookingStatus.CANCELLED_BY_USER);
    const past = bookings.filter(b => new Date(b.startDate) < now || b.status === BookingStatus.CANCELLED_BY_USER);
    return {
      upcomingBookings: upcoming.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
      pastBookings: past.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()),
    };
  }, [bookings]);

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex justify-center items-center py-20"><Loader2 className="h-12 w-12 animate-spin text-blue-600" /></div>;
    }
    if (isError) {
      return (
        <div className="flex flex-col justify-center items-center py-20 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 p-4 rounded-lg">
          <AlertTriangle className="h-12 w-12 mb-4" />
          <p className="font-semibold">{t('common.error.fetchFailed')}</p>
          <p className="text-sm">{t('common.error.tryAgain')}</p>
          <button onClick={() => refetch()} className="btn-secondary mt-4">{t('common.actions.retry')}</button>
        </div>
      );
    }
    if (!bookings || bookings.length === 0) {
      return (
        <div className="text-center py-20 px-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
          <Archive className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">{t('tours.booked.emptyState.title')}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('tours.booked.emptyState.subtitle')}</p>
          <div className="mt-6">
            <Link to="/marketplace/tours" className="btn-primary">
              {t('tours.booked.emptyState.cta')}
            </Link>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-12">
        <section>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">{t('tours.booked.upcomingTitle')}</h2>
          {upcomingBookings.length > 0 ? (
            <div className="space-y-4">
              <AnimatePresence>
                {upcomingBookings.map(booking => <BookingCard key={booking.bookingId} booking={booking} onCancel={handleCancelBooking} />)}
              </AnimatePresence>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">{t('tours.booked.noUpcoming')}</p>
          )}
        </section>
        <section>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">{t('tours.booked.pastTitle')}</h2>
          {pastBookings.length > 0 ? (
            <div className="space-y-4">
              <AnimatePresence>
                {pastBookings.map(booking => <BookingCard key={booking.bookingId} booking={booking} onCancel={handleCancelBooking} />)}
              </AnimatePresence>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">{t('tours.booked.noPast')}</p>
          )}
        </section>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('tours.booked.pageTitle')}</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t('tours.booked.pageSubtitle')}</p>
      </div>
      {renderContent()}
    </motion.div>
  );
};

export default MyBookedToursPage;
