import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Loader2, Send } from 'lucide-react';

// --- Type Definitions ---
type Mood = 'SAD' | 'NEUTRAL' | 'HAPPY' | 'AMAZING';

interface MoodRatingWidgetProps {
  rideId: string;
  onRatingSubmit: (rating: { rideId: string; mood: Mood }) => void; // Callback to notify parent
  onClose: () => void;
}

// --- Mock API Hook ---
const useSubmitMoodRatingMutation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const mutate = async (data: { rideId: string; mood: Mood }) => {
    setIsLoading(true);
    console.log('Submitting Mood Rating:', data);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    return { success: true };
  };
  return [mutate, { isLoading }] as const;
};

// --- Main Component ---
const MoodRatingWidget: React.FC<MoodRatingWidgetProps> = ({ rideId, onRatingSubmit, onClose }) => {
  const { t } = useTranslation();
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitMoodRating, { isLoading }] = useSubmitMoodRatingMutation();

  const moodOptions: { mood: Mood; emoji: string; labelKey: string }[] = [
    { mood: 'SAD', emoji: '😞', labelKey: 'moodRating.sad' },
    { mood: 'NEUTRAL', emoji: '😐', labelKey: 'moodRating.neutral' },
    { mood: 'HAPPY', emoji: '😊', labelKey: 'moodRating.happy' },
    { mood: 'AMAZING', emoji: '🤩', labelKey: 'moodRating.amazing' },
  ];

  const handleMoodSelect = async (mood: Mood) => {
    if (isLoading || isSubmitted) return;
    setSelectedMood(mood);

    try {
      await submitMoodRating({ rideId, mood });
      toast.success(t('moodRating.successToast'));
      setIsSubmitted(true);
      onRatingSubmit({ rideId, mood });
      // The widget will close itself after a short delay
      setTimeout(() => {
        onClose();
      }, 1500); // Give user time to see the "Thank You" message
    } catch (error: any) {
      toast.error(t('moodRating.errorToast', { message: error.message }));
      setSelectedMood(null); // Reset on error
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 15, stiffness: 200 } },
    exit: { opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } },
  };

  return (
    <AnimatePresence>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white dark:bg-gray-800 p-5 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-40"
      >
        {isSubmitted ? (
          <div className="text-center py-4">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">{t('moodRating.thankYou')}</p>
            </motion.div>
          </div>
        ) : (
          <>
            <h3 className="text-center text-lg font-semibold text-gray-800 dark:text-white mb-4">
              {t('moodRating.title')}
            </h3>
            <div className="flex justify-around items-center">
              {moodOptions.map(({ mood, emoji, labelKey }) => (
                <motion.button
                  key={mood}
                  onClick={() => handleMoodSelect(mood)}
                  disabled={isLoading}
                  className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800
                    ${selectedMood === mood ? 'focus:ring-blue-500' : 'focus:ring-gray-400'}
                    ${isLoading && selectedMood !== mood ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  whileHover={{ scale: isLoading ? 1 : 1.15 }}
                  whileTap={{ scale: isLoading ? 1 : 0.95 }}
                >
                  <span className={`text-4xl transition-transform duration-200 ${selectedMood === mood ? 'scale-125' : 'grayscale opacity-60'}`}>
                    {emoji}
                  </span>
                  <span className={`text-xs font-medium transition-colors ${selectedMood === mood ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {t(labelKey)}
                  </span>
                </motion.button>
              ))}
            </div>
            {isLoading && selectedMood && (
                <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 flex items-center justify-center rounded-xl">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600"/>
                </div>
            )}
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default MoodRatingWidget;
