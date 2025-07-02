import React, { useState, useEffect } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Calendar, Clock, Users, DollarSign, MessageSquare, Sparkles, Loader2, ArrowRight, User, Car, Map } from 'lucide-react';

import { useAppSelector } from '../../../store/hooks';
import { usePostJourneyMutation } from '../../../services/api/journeyApi';
import { selectYalurideProfile } from '../../auth/store/slices/authSlice';
import { ToggleSwitch } from '../../../components/common/ToggleSwitch';
import { Journey, UserRole } from '../../../types/yaluride';
import { NetworkManagerInstance } from '../../../utils/networkManager';
import { OfflineQueueAPI, ActionType, ActionPriority } from '../../../utils/offlineQueueManager';

// --- Zod Validation Schema ---
const getPostJourneySchema = (t: (key: string) => string, isDriverMode: boolean) => z.object({
  pickup_location_text: z.string().min(5, { message: t('validation.journey.pickupRequired') }),
  dropoff_location_text: z.string().min(5, { message: t('validation.journey.destinationRequired') }),
  departure_date: z.string().min(1, { message: t('validation.journey.dateRequired') }),
  departure_time: z.string().min(1, { message: t('validation.journey.timeRequired') }),
  passenger_count: z.number().min(1, { message: t('validation.journey.minPassengers') }).max(10, { message: t('validation.journey.maxPassengers') }),
  is_sharable: z.boolean().default(false),
  max_passengers: z.number().optional(),
  notes: z.string().max(500, { message: t('validation.maxLength', { max: 500 }) }).optional(),
  max_price: z.number({ invalid_type_error: t('validation.priceInvalid') }).positive({ message: t('validation.positivePrice') }).optional(),
}).refine(data => {
  if (isDriverMode) return true; // No need to check sharable seats for driver
  return !data.is_sharable || (data.max_passengers && data.max_passengers >= data.passenger_count);
}, {
  message: t('validation.journey.sharableSeatsInvalid'),
  path: ['max_passengers'],
});

type JourneyFormData = z.infer<ReturnType<typeof getPostJourneySchema>>;

// --- Main Component ---
const PostJourneyPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const userProfile = useAppSelector(selectYalurideProfile);

  const [postJourney, { isLoading }] = usePostJourneyMutation();
  const [isOnline, setIsOnline] = useState(NetworkManagerInstance.isOnline());

  const canPostAsDriver = userProfile?.role === UserRole.DRIVER || userProfile?.role === UserRole.BOTH;
  const [postingAsDriver, setPostingAsDriver] = useState<boolean>(false);

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

  const postJourneySchema = getPostJourneySchema(t, postingAsDriver);
  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<JourneyFormData>({
    resolver: zodResolver(postJourneySchema),
    mode: 'onChange',
    defaultValues: {
      passenger_count: 1,
      is_sharable: false,
    }
  });

  const isSharable = watch('is_sharable');
  const passengerCount = watch('passenger_count');

  /**
   * Whenever the user toggles between Passenger / Driver mode we want the form to
   * reflect sensible defaults:
   *  - Driver mode : sharable is ALWAYS true & passenger_count represents available seats (default 3)
   *  - Passenger mode : sharable off by default, passenger_count defaults back to 1
   */
  useEffect(() => {
    if (postingAsDriver) {
      setValue('is_sharable', true);
      // Only change seats if the current value is the old passenger default
      setValue('passenger_count', passengerCount === 1 ? 3 : passengerCount);
    } else {
      setValue('is_sharable', false);
      // Reset passenger count to default (1) for passenger mode
      setValue('passenger_count', 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postingAsDriver]);

  /**
   * If the sharable toggle is turned off in passenger mode, ensure we clear any
   * previously entered max_passengers value to avoid sending stale data.
   */
  useEffect(() => {
    if (!isSharable && !postingAsDriver) {
      setValue('max_passengers', undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSharable, postingAsDriver]);

  const onSubmit: SubmitHandler<JourneyFormData> = async (formData) => {
    const departure_time = new Date(`${formData.departure_date}T${formData.departure_time}`).toISOString();
    
    const journeyData: Partial<Journey> = {
      pickup_location_text: formData.pickup_location_text,
      dropoff_location_text: formData.dropoff_location_text,
      departure_time,
      notes: formData.notes,
      max_price: formData.max_price ? Number(formData.max_price) : undefined,
    };

    if (postingAsDriver) {
      journeyData.posted_by_role = UserRole.DRIVER;
      journeyData.is_sharable = true; // Driver journeys are always sharable
      // Do not send passenger_count for driver-initiated journeys.
      journeyData.max_passengers = Number(formData.passenger_count); // This field now represents "available seats"
    } else {
      journeyData.posted_by_role = UserRole.PASSENGER;
      journeyData.passenger_count = Number(formData.passenger_count);
      journeyData.is_sharable = formData.is_sharable;
      journeyData.max_passengers = formData.is_sharable ? Number(formData.max_passengers) : undefined;
    }

    if (!isOnline) {
      toast.info(t('postJourney.offline.info'));
      try {
        await OfflineQueueAPI.addToQueue(
          ActionType.POST_JOURNEY,
          journeyData,
          ActionPriority.HIGH,
          { userFacingText: t('postJourney.offline.queuedMessage') }
        );
        navigate('/marketplace'); // Navigate away optimistically
      } catch (queueError) {
        console.error("Failed to queue journey request:", queueError);
        toast.error(t('postJourney.error.queueFailed'));
      }
      return;
    }

    try {
      const newJourney = await postJourney(journeyData).unwrap();
      toast.success(t('postJourney.success.online', { journeyId: newJourney.id }));
      navigate(`/journeys/${newJourney.id}`); // Navigate to the new journey's detail page
    } catch (err) {
      console.error('Failed to post journey:', err);
      toast.error((err as any)?.data?.message || t('postJourney.error.submitFailed'));
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          <MapPin className="mr-3 h-8 w-8 text-blue-600 dark:text-blue-400" />
          {t('postJourney.title')}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{t('postJourney.subtitle')}</p>
      </motion.div>

      {canPostAsDriver && (
        <div className="my-6 p-4 bg-blue-50 dark:bg-gray-700 rounded-lg flex items-center justify-center space-x-4">
            <span className={`font-medium ${!postingAsDriver ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500'}`}>
                <Users className="inline-block mr-2" size={18}/> {t('postJourney.roleToggle.passenger')}
            </span>
            <ToggleSwitch checked={postingAsDriver} onChange={setPostingAsDriver} />
            <span className={`font-medium ${postingAsDriver ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500'}`}>
                <Car className="inline-block mr-2" size={18}/> {t('postJourney.roleToggle.driver')}
            </span>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <motion.form 
          onSubmit={handleSubmit(onSubmit)} 
          className="md:col-span-2 space-y-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Location Fields */}
          <div className="space-y-4">
            <div>
              <label htmlFor="pickup_location_text" className="form-label">{t('postJourney.pickupLabel')}</label>
              <input id="pickup_location_text" type="text" {...register('pickup_location_text')} className="form-input" placeholder={t('postJourney.enterAddressPlaceholder')} />
              {errors.pickup_location_text && <p className="form-error">{errors.pickup_location_text.message}</p>}
            </div>
            <div>
              <label htmlFor="dropoff_location_text" className="form-label">{t('postJourney.destinationLabel')}</label>
              <input id="dropoff_location_text" type="text" {...register('dropoff_location_text')} className="form-input" placeholder={t('postJourney.enterAddressPlaceholder')} />
              {errors.dropoff_location_text && <p className="form-error">{errors.dropoff_location_text.message}</p>}
            </div>
          </div>
          
          {/* Date and Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="departure_date" className="form-label">{t('postJourney.dateLabel')}</label>
              <input id="departure_date" type="date" {...register('departure_date')} className="form-input" min={new Date().toISOString().split('T')[0]} />
              {errors.departure_date && <p className="form-error">{errors.departure_date.message}</p>}
            </div>
            <div>
              <label htmlFor="departure_time" className="form-label">{t('postJourney.timeLabel')}</label>
              <input id="departure_time" type="time" {...register('departure_time')} className="form-input" />
              {errors.departure_time && <p className="form-error">{errors.departure_time.message}</p>}
            </div>
          </div>

          {/* Passengers and Sharable Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <label htmlFor="passenger_count" className="form-label">{postingAsDriver ? t('postJourney.sharable.availableSeatsLabel') : t('postJourney.passengersLabel')}</label>
              <input id="passenger_count" type="number" {...register('passenger_count', { valueAsNumber: true })} className="form-input" min="1" max="10" />
              {errors.passenger_count && <p className="form-error">{errors.passenger_count.message}</p>}
            </div>
            {!postingAsDriver && (
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                <label htmlFor="is_sharable" className="form-label mb-0">{t('postJourney.sharable.label')}</label>
                <Controller name="is_sharable" control={control} render={({ field }) => <ToggleSwitch checked={field.value} onChange={field.onChange} />} />
              </div>
            )}
          </div>
          
          <AnimatePresence>
            {isSharable && !postingAsDriver && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <div>
                  <label htmlFor="max_passengers" className="form-label">{t('postJourney.sharable.maxPassengersLabel')}</label>
                  <input id="max_passengers" type="number" {...register('max_passengers', { valueAsNumber: true })} className="form-input" min={passengerCount} max="10" />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('postJourney.sharable.maxPassengersDesc')}</p>
                  {errors.max_passengers && <p className="form-error">{errors.max_passengers.message}</p>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Notes and Budget/Price */}
          <div>
            <label htmlFor="notes" className="form-label">{t('postJourney.specialRequestsLabel')}</label>
            <textarea id="notes" {...register('notes')} rows={3} className="form-input" placeholder={t('postJourney.specialRequestsPlaceholder')} />
            {errors.notes && <p className="form-error">{errors.notes.message}</p>}
          </div>
          <div>
            <label htmlFor="max_price" className="form-label">{postingAsDriver ? t('postJourney.pricePerSeatLabel') : t('postJourney.maxPriceLabel')} ({postingAsDriver ? t('common.required') : t('common.optional')})</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-gray-500 sm:text-sm">LKR</span>
              </div>
              <input id="max_price" type="number" {...register('max_price', { valueAsNumber: true, required: postingAsDriver })} className="form-input pl-12" placeholder="5000" />
            </div>
            {errors.max_price && <p className="form-error">{errors.max_price.message}</p>}
          </div>
          
          {/* Submit Button */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <button type="submit" disabled={isLoading || !isOnline} className="w-full btn-primary flex items-center justify-center disabled:opacity-60">
              {isLoading ? (
                <Loader2 className="animate-spin mr-2" size={20} />
              ) : (
                <ArrowRight className="mr-2" size={20} />
              )}
              {isLoading ? t('postJourney.submitting') : t('postJourney.submitButton')}
            </button>
            {!isOnline && <p className="text-center text-sm text-yellow-600 dark:text-yellow-400 mt-3">{t('postJourney.offline.info')}</p>}
          </div>
        </motion.form>

        {/* Map Placeholder Section */}
        <motion.div 
          className="md:col-span-1"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="sticky top-24">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('postJourney.mapTitle')}</h3>
            <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-xl shadow-lg flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <Map size={48} />
                <p className="mt-2 text-sm">{t('postJourney.mapPreviewPlaceholder')}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PostJourneyPage;
