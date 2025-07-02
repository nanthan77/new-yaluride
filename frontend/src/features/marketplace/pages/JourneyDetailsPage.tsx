import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  MapPin,
  Clock,
  DollarSign,
  User,
  Star,
  Calendar,
  Users,
  ChevronDown,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Info,
} from 'lucide-react';

// --- Type Definitions (should be in a shared types file) ---
interface TourStop {
  day_number: number;
  title: string;
  description: string;
  location_name: string;
  site_info?: {
    description?: string;
    image_url?: string;
  };
}

interface TourPackageDetails {
  id: string;
  package_name: string;
  description: string;
  cover_image_url: string;
  duration_days: number;
  price: number;
  currency: 'LKR' | 'USD';
  is_active: boolean;
  driver: {
    id: string;
    name: string;
    profile_picture_url?: string;
    avg_rating: number;
    member_since: string; // ISO Date string
  };
  stops: TourStop[];
}

interface BookingFormValues {
  startDate: string;
  passengerCount: number;
}

// --- Mock API Hooks (to be replaced with actual RTK Query hooks) ---
const MOCK_PACKAGE_DETAILS: TourPackageDetails = {
  id: 'pkg-1',
  package_name: 'Kandy Cultural Triangle & Tea Country Tour',
  description: 'Embark on a breathtaking journey through the heart of Sri Lanka. Discover ancient kingdoms, sacred temples, and lush tea plantations. This tour offers a perfect blend of culture, history, and natural beauty, guided by an experienced local driver.',
  cover_image_url: 'https://images.unsplash.com/photo-1598506376398-3c6241e5a396?q=80&w=2070&auto=format&fit=crop',
  duration_days: 5,
  price: 85000,
  currency: 'LKR',
  is_active: true,
  driver: {
    id: 'driver-1',
    name: 'Saman Kumara',
    profile_picture_url: 'https://i.pravatar.cc/150?u=driver-1',
    avg_rating: 4.9,
    member_since: '2022-03-15T00:00:00Z',
  },
  stops: [
    { day_number: 1, title: 'Arrival & Pinnawala', location_name: 'Pinnawala', description: 'Visit the famous Pinnawala Elephant Orphanage to see the gentle giants. Settle in Kandy for the night.' },
    { day_number: 2, title: 'Sacred City of Kandy', location_name: 'Kandy', description: 'Explore the Temple of the Sacred Tooth Relic (Sri Dalada Maligawa) and enjoy a cultural dance show in the evening.' },
    { day_number: 3, title: 'Nuwara Eliya Tea Plantations', location_name: 'Nuwara Eliya', description: 'Journey into the cool highlands. Visit a tea factory to learn about Ceylon tea and enjoy stunning views of the plantations.' },
    { day_number: 4, title: 'Sigiriya Rock Fortress', location_name: 'Sigiriya', description: 'Climb the magnificent Sigiriya Rock Fortress, a UNESCO World Heritage site, and marvel at the ancient frescoes and water gardens.' },
    { day_number: 5, title: 'Dambulla Cave Temple & Departure', location_name: 'Dambulla', description: 'Visit the Dambulla Golden Rock Cave Temple, another UNESCO site, before heading back towards Colombo.' },
  ],
};

const useGetPackageDetailsQuery = (packageId: string | undefined) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(timer);
  }, [packageId]);

  return { data: MOCK_PACKAGE_DETAILS, isLoading, isError };
};

const useBookPackageMutation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const mutate = async (bookingDetails: { packageId: string; data: BookingFormValues }) => {
    setIsLoading(true);
    console.log('Booking submitted:', bookingDetails);
    await new Promise(resolve => setTimeout(resolve, 2000));
    // To test error: if (bookingDetails.data.passengerCount > 5) throw new Error("Booking failed: Max 5 passengers");
    setIsLoading(false);
    return { success: true, bookingId: `booking_${crypto.randomUUID()}` };
  };
  return [mutate, { isLoading }] as const;
};

// --- Sub-components ---

const PackageHeader: React.FC<{ name: string; imageUrl: string }> = ({ name, imageUrl }) => (
  <div className="relative h-64 md:h-80 w-full rounded-lg overflow-hidden">
    <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
    <div className="absolute bottom-0 left-0 p-6">
      <h1 className="text-3xl md:text-4xl font-extrabold text-white shadow-lg">{name}</h1>
    </div>
  </div>
);

const PackageInfo: React.FC<{ tour: TourPackageDetails }> = ({ tour }) => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center my-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
      <div className="flex flex-col items-center">
        <Clock className="h-7 w-7 text-blue-500 mb-2" />
        <span className="font-bold text-lg text-gray-800 dark:text-white">{tour.duration_days}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{t('tours.details.days')}</span>
      </div>
      <div className="flex flex-col items-center">
        <DollarSign className="h-7 w-7 text-green-500 mb-2" />
        <span className="font-bold text-lg text-gray-800 dark:text-white">{tour.price.toLocaleString()}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{t('tours.details.pricePerPerson', { currency: tour.currency })}</span>
      </div>
      <div className="flex flex-col items-center">
        <User className="h-7 w-7 text-purple-500 mb-2" />
        <span className="font-bold text-lg text-gray-800 dark:text-white">{tour.driver.name}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{t('tours.details.yourGuide')}</span>
      </div>
      <div className="flex flex-col items-center">
        <Star className="h-7 w-7 text-yellow-500 mb-2" />
        <span className="font-bold text-lg text-gray-800 dark:text-white">{tour.driver.avg_rating.toFixed(1)}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{t('tours.details.driverRating')}</span>
      </div>
    </div>
  );
};

const ItineraryAccordion: React.FC<{ stops: TourStop[] }> = ({ stops }) => {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('tours.details.itinerary')}</h3>
      {stops.map((stop, index) => (
        <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="font-semibold text-gray-800 dark:text-gray-200">{t('tours.details.day', { day: stop.day_number })}: {stop.title}</span>
            <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${openIndex === index ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {openIndex === index && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{stop.description}</p>
                  <div className="mt-3 flex items-center text-xs text-blue-600 dark:text-blue-400">
                    <MapPin size={14} className="mr-2" />
                    <span>{t('tours.details.mainLocation')}: {stop.location_name}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

const BookingForm: React.FC<{ tour: TourPackageDetails }> = ({ tour }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [bookPackage, { isLoading }] = useBookPackageMutation();
  const { register, handleSubmit, control, formState: { errors } } = useForm<BookingFormValues>({
    defaultValues: {
      startDate: new Date().toISOString().split('T')[0],
      passengerCount: 1,
    },
  });

  const onSubmit = async (data: BookingFormValues) => {
    toast.loading(t('tours.booking.submitting'), { id: 'booking-toast' });
    try {
      await bookPackage({ packageId: tour.id, data });
      toast.success(t('tours.booking.success'), { id: 'booking-toast' });
      navigate('/profile/my-tours'); // Redirect to bookings page on success
    } catch (error: any) {
      toast.error(t('tours.booking.error', { message: error.message }), { id: 'booking-toast' });
    }
  };

  return (
    <div className="sticky top-24">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 space-y-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('tours.booking.title')}</h3>
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('tours.booking.startDate')}</label>
          <input
            id="startDate"
            type="date"
            min={new Date().toISOString().split('T')[0]}
            {...register('startDate', { required: true })}
            className="mt-1 form-input w-full"
          />
        </div>
        <div>
          <label htmlFor="passengerCount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('tours.booking.passengers')}</label>
          <input
            id="passengerCount"
            type="number"
            min="1"
            max="10" // Or get from package details if available
            {...register('passengerCount', { required: true, valueAsNumber: true, min: 1 })}
            className="mt-1 form-input w-full"
          />
        </div>
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('tours.booking.totalPrice')}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {tour.currency} {(tour.price * (useForm<BookingFormValues>().watch('passengerCount') || 1)).toLocaleString()}
          </p>
        </div>
        <button type="submit" className="btn-primary w-full text-lg" disabled={isLoading}>
          {isLoading ? <Loader2 className="animate-spin h-6 w-6 mx-auto" /> : t('tours.booking.bookNow')}
        </button>
      </form>
    </div>
  );
};

// --- Main Page Component ---
const JourneyDetailsPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: tour, isLoading, isError } = useGetPackageDetailsQuery(id);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isError || !tour) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center p-4">
        <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t('common.error.fetchFailed')}</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">{t('tours.details.notFound')}</p>
        <button onClick={() => navigate('/marketplace')} className="btn-primary mt-6">
          {t('tours.details.backToMarketplace')}
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-gray-50 dark:bg-gray-900 min-h-screen"
    >
      <div className="container mx-auto px-4 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6">
          <ArrowLeft size={18} className="mr-2" />
          {t('common.back')}
        </button>

        <PackageHeader name={tour.package_name} imageUrl={tour.cover_image_url} />
        
        <div className="lg:grid lg:grid-cols-3 lg:gap-12 mt-8">
          {/* Left Column: Details & Itinerary */}
          <div className="lg:col-span-2 space-y-8">
            <PackageInfo tour={tour} />
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('tours.details.aboutTour')}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{tour.description}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <ItineraryAccordion stops={tour.stops} />
            </div>
          </div>

          {/* Right Column: Booking Form (Sticky) */}
          <div className="lg:col-span-1 mt-8 lg:mt-0">
            <BookingForm tour={tour} />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default JourneyDetailsPage;
