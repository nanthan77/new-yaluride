import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle, X, Frown, Meh, Smile, Laugh, Heart } from 'lucide-react';
import { toast } from 'react-hot-toast';

// --- Type Definitions ---
interface MoodRatingWidgetProps {
  rideId: string;
  isVisible: boolean;
  onDismiss: () => void;
}

type MoodOption = {
  value: number;
  labelKey: string;
  Icon: React.ElementType;
  colorClass: string;
  hoverColorClass: string;
};

// --- Mock API Hook ---
// In a real app, this would be defined in an RTK Query slice (e.g., rideApi.ts)
const useSubmitMoodRatingMutation = () => {
  const [isLoading, setIsLoading] = useState(false);

  const mutate = async (data: { rideId: string; ratingValue: number }) => {
    setIsLoading(true);
    console.log('Submitting mood rating:', data);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1200));

    if (data.ratingValue < 1 || data.ratingValue > 5) {
      setIsLoading(false);
      throw new Error("Invalid rating value.");
    }
    
    setIsLoading(false);
    return { success: true, message: 'Mood rating submitted successfully!', ...data };
  };

  return [mutate, { isLoading }] as const;
};

// --- Component ---
const MoodRatingWidget: React.FC<MoodRatingWidgetProps> = ({
  rideId,
  isVisible,
  onDismiss,
}) => {
  const { t } = useTranslation();
  const [submitMoodRating, { isLoading }] = useSubmitMoodRatingMutation();

  const [selectedMood, setSelectedMood] = useState<MoodOption | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const moodOptions: MoodOption[] = useMemo(() => [
    { value: 1, labelKey: 'moods.terrible', Icon: Frown, colorClass: 'text-red-500', hoverColorClass: 'hover:bg-red-100 dark:hover:bg-red-900/50' },
    { value: 2, labelKey: 'moods.bad', Icon: Meh, colorClass: 'text-orange-500', hoverColorClass: 'hover:bg-orange-100 dark:hover:bg-orange-900/50' },
    { value: 3, labelKey: 'moods.okay', Icon: Smile, colorClass: 'text-yellow-500', hoverColorClass: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/50' },
    { value: 4, labelKey: 'moods.good', Icon: Laugh, colorClass: 'text-green-500', hoverColorClass: 'hover:bg-green-100 dark:hover:bg-green-900/50' },
    { value: 5, labelKey: 'moods.excellent', Icon: Heart, colorClass: 'text-pink-500', hoverColorClass: 'hover:bg-pink-100 dark:hover:bg-pink-900/50' },
  ], []);

  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        onDismiss();
        // Reset state after dismissal animation completes
        setTimeout(() => {
            setStatus('idle');
            setSelectedMood(null);
        }, 300);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, onDismiss]);

  const handleSubmit = async () => {
    if (!selectedMood || isLoading) return;

    setStatus('loading');
    try {
      await submitMoodRating({ rideId, ratingValue: selectedMood.value });
      setStatus('success');
      toast.success(t('ride.moodRating.successToast'));
    } catch (error: any) {
      console.error('Failed to submit mood rating:', error);
      toast.error(t('ride.moodRating.errorToast', { message: error.message }));
      setStatus('idle');
    }
  };

  const handleSkip = () => {
    if (isLoading) return;
    toast(t('ride.moodRating.skipInfo'), { icon: '👍' });
    onDismiss();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mood-rating-title"
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          >
            <AnimatePresence mode="wait">
              {status === 'success' ? (
                <motion.div
                  key="success-view"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex flex-col items-center justify-center p-8 text-center"
                >
                  <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('common.thankYouForFeedback')}</h2>
                  <p className="text-gray-600 dark:text-gray-300 mt-2">
                    {t('ride.moodRating.successMessage')}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="form-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-6"
                >
                  <div className="text-center">
                    <h2 id="mood-rating-title" className="text-lg font-bold text-gray-900 dark:text-white">
                      {t('ride.moodRating.title')}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {t('ride.moodRating.description')}
                    </p>
                  </div>

                  <div className="mt-6 flex justify-around items-center">
                    {moodOptions.map((mood) => (
                      <motion.button
                        key={mood.value}
                        onClick={() => setSelectedMood(mood)}
                        className="p-2 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500"
                        aria-label={t(mood.labelKey)}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <mood.Icon
                          className={`h-10 w-10 transition-all duration-200 ${
                            selectedMood?.value === mood.value
                              ? `${mood.colorClass} transform scale-125`
                              : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                          }`}
                        />
                      </motion.button>
                    ))}
                  </div>
                  
                  <AnimatePresence>
                    {selectedMood && (
                        <motion.p 
                            key={selectedMood.value}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center mt-4 font-semibold text-gray-800 dark:text-gray-200"
                        >
                            {t(selectedMood.labelKey)}
                        </motion.p>
                    )}
                  </AnimatePresence>
                  
                  <div className="mt-6 flex flex-col space-y-3">
                    <button
                      onClick={handleSubmit}
                      disabled={!selectedMood || isLoading}
                      className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        t('common.submit')
                      )}
                    </button>
                    <button
                      onClick={handleSkip}
                      className="w-full text-center text-sm text-gray-500 dark:text-gray-400 hover:underline"
                    >
                      {t('common.skipForNow')}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MoodRatingWidget;
