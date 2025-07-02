import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, SubmitHandler, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { PlusCircle, Trash2, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Mock/Placeholder Imports & Hooks ---
// In a real application, these would come from your Redux store, API slices, and auth hooks.
const useAuth = () => ({
  user: { id: 'driver-uuid-123', name: 'John Doe', role: 'driver' },
});

// Mock API mutation hook
const useCreateTourPackageMutation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const mutate = async (data: any) => {
    setIsLoading(true);
    console.log('Submitting new tour package:', data);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate a successful response
    if (Math.random() > 0.1) { // 90% success rate
      setIsLoading(false);
      return { data: { id: `tour_${Math.random().toString(36).substr(2, 9)}`, ...data } };
    } else {
      setIsLoading(false);
      throw new Error('A server error occurred. Please try again.');
    }
  };
  return [mutate, { isLoading }];
};
// --- End Mock Imports ---

interface ItineraryItemForm {
  title: string;
  description: string;
  locations_to_visit: string; // Storing as comma-separated string for simplicity in form
}

interface IFormInput {
  title: string;
  description: string;
  duration_days: number;
  price: number;
  max_travelers: number;
  included_services: string;
  excluded_services: string;
  itinerary: ItineraryItemForm[];
}

const CreateTourPackagePage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [createTourPackage, { isLoading: isSubmitting }] = useCreateTourPackageMutation();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    watch,
    reset,
  } = useForm<IFormInput>({
    mode: 'onChange',
    defaultValues: {
      title: '',
      description: '',
      duration_days: 1,
      price: 10000,
      max_travelers: 2,
      included_services: '',
      excluded_services: '',
      itinerary: [{ title: '', description: '', locations_to_visit: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'itinerary',
  });

  const duration = watch('duration_days');

  // Sync the number of itinerary items with the duration_days value
  useEffect(() => {
    const currentCount = fields.length;
    const targetCount = Number(duration) || 0;

    if (currentCount < targetCount) {
      for (let i = currentCount; i < targetCount; i++) {
        append({ title: '', description: '', locations_to_visit: '' });
      }
    } else if (currentCount > targetCount) {
      for (let i = currentCount - 1; i >= targetCount; i--) {
        remove(i);
      }
    }
  }, [duration, fields.length, append, remove]);

  const onSubmit: SubmitHandler<IFormInput> = async (data) => {
    const submissionToastId = toast.loading(t('tours.create.toast.submitting'));

    try {
      // Transform comma-separated strings into arrays
      const payload = {
        ...data,
        price: Number(data.price),
        duration_days: Number(data.duration_days),
        max_travelers: Number(data.max_travelers),
        included_services: data.included_services.split(',').map(s => s.trim()).filter(Boolean),
        excluded_services: data.excluded_services.split(',').map(s => s.trim()).filter(Boolean),
        itinerary: data.itinerary.map(item => ({
            ...item,
            locations_to_visit: item.locations_to_visit.split(',').map(s => s.trim()).filter(Boolean)
        }))
      };

      await createTourPackage(payload);
      
      toast.success(t('tours.create.toast.success'), { id: submissionToastId });
      reset(); // Reset form after successful submission
    } catch (error: any) {
      toast.error(t('tours.create.toast.error', { message: error.message }), { id: submissionToastId });
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('tours.create.title')}</h1>
        <p className="mt-2 text-md text-gray-600 dark:text-gray-400">{t('tours.create.subtitle')}</p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Section 1: Package Details */}
        <section className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold border-b border-gray-200 dark:border-gray-700 pb-3 mb-6">{t('tours.create.sectionDetails')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title */}
            <div className="col-span-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('tours.create.fields.title.label')}</label>
              <input
                id="title"
                type="text"
                {...register('title', { required: t('tours.create.validation.titleRequired') })}
                className="mt-1 block w-full form-input"
                placeholder={t('tours.create.fields.title.placeholder')}
              />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
            </div>

            {/* Description */}
            <div className="col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('tours.create.fields.description.label')}</label>
              <textarea
                id="description"
                rows={4}
                {...register('description', { required: t('tours.create.validation.descriptionRequired') })}
                className="mt-1 block w-full form-textarea"
                placeholder={t('tours.create.fields.description.placeholder')}
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
            </div>

            {/* Duration, Price, Max Travelers */}
            <div>
              <label htmlFor="duration_days" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('tours.create.fields.duration.label')}</label>
              <input
                id="duration_days"
                type="number"
                {...register('duration_days', { required: true, valueAsNumber: true, min: 1, max: 30 })}
                className="mt-1 block w-full form-input"
              />
            </div>
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('tours.create.fields.price.label')}</label>
              <input
                id="price"
                type="number"
                step="100"
                {...register('price', { required: true, valueAsNumber: true, min: 0 })}
                className="mt-1 block w-full form-input"
                placeholder="e.g., 50000"
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label htmlFor="max_travelers" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('tours.create.fields.maxTravelers.label')}</label>
              <input
                id="max_travelers"
                type="number"
                {...register('max_travelers', { required: true, valueAsNumber: true, min: 1, max: 20 })}
                className="mt-1 block w-full form-input"
              />
            </div>
            
            {/* Included/Excluded Services */}
            <div className="col-span-2">
              <label htmlFor="included_services" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('tours.create.fields.included.label')}</label>
              <input
                id="included_services"
                type="text"
                {...register('included_services')}
                className="mt-1 block w-full form-input"
                placeholder={t('tours.create.fields.included.placeholder')}
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="excluded_services" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('tours.create.fields.excluded.label')}</label>
              <input
                id="excluded_services"
                type="text"
                {...register('excluded_services')}
                className="mt-1 block w-full form-input"
                placeholder={t('tours.create.fields.excluded.placeholder')}
              />
            </div>
          </div>
        </section>
        
        {/* Section 2: Daily Itinerary */}
        <section className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold border-b border-gray-200 dark:border-gray-700 pb-3 mb-6">{t('tours.create.sectionItinerary')}</h2>
          <div className="space-y-6">
            <AnimatePresence>
              {fields.map((field, index) => (
                <motion.div
                  key={field.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4 relative"
                >
                  <h3 className="font-bold text-lg text-blue-600 dark:text-blue-400">{t('tours.create.dayLabel', { day: index + 1 })}</h3>
                  
                  <div>
                    <label htmlFor={`itinerary.${index}.title`} className="block text-sm font-medium">{t('tours.create.fields.itineraryTitle.label')}</label>
                    <input
                      id={`itinerary.${index}.title`}
                      {...register(`itinerary.${index}.title`, { required: t('tours.create.validation.itineraryTitleRequired') })}
                      className="mt-1 block w-full form-input"
                      placeholder={t('tours.create.fields.itineraryTitle.placeholder')}
                    />
                    {errors.itinerary?.[index]?.title && <p className="mt-1 text-sm text-red-600">{errors.itinerary[index].title.message}</p>}
                  </div>

                  <div>
                    <label htmlFor={`itinerary.${index}.description`} className="block text-sm font-medium">{t('tours.create.fields.itineraryDescription.label')}</label>
                    <textarea
                      id={`itinerary.${index}.description`}
                      rows={3}
                      {...register(`itinerary.${index}.description`, { required: t('tours.create.validation.itineraryDescriptionRequired') })}
                      className="mt-1 block w-full form-textarea"
                      placeholder={t('tours.create.fields.itineraryDescription.placeholder')}
                    />
                    {errors.itinerary?.[index]?.description && <p className="mt-1 text-sm text-red-600">{errors.itinerary[index].description.message}</p>}
                  </div>
                  
                  <div>
                    <label htmlFor={`itinerary.${index}.locations_to_visit`} className="block text-sm font-medium">{t('tours.create.fields.locations.label')}</label>
                    <input
                      id={`itinerary.${index}.locations_to_visit`}
                      {...register(`itinerary.${index}.locations_to_visit`)}
                      className="mt-1 block w-full form-input"
                      placeholder={t('tours.create.fields.locations.placeholder')}
                    />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* Form Submission */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSubmitting || !isDirty || !isValid}
            className="flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                {t('tours.create.button.submitting')}
              </>
            ) : (
              <>
                {t('tours.create.button.submit')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTourPackagePage;
