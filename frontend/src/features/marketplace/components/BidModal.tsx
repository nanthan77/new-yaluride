import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { DollarSign, Loader2, Send, X } from 'lucide-react';
import { Journey } from './DriverMarketplace'; // Assuming Journey type is exported from here

// --- Type Definitions ---
interface BidModalProps {
  journey: Journey | null;
  isOpen: boolean;
  onClose: () => void;
  onBidSubmitted: () => void; // Callback to refresh the journey list
}

interface BidFormValues {
  bidAmount: number;
  message?: string;
}

// --- Zod Validation Schema ---
const getBidSchema = (t: Function) => z.object({
  bidAmount: z
    .number({
      required_error: t('marketplace.driver.bidModal.validation.amountRequired'),
      invalid_type_error: t('marketplace.driver.bidModal.validation.amountRequired'),
    })
    .positive({ message: t('marketplace.driver.bidModal.validation.amountPositive') }),
  message: z
    .string()
    .max(250, { message: t('marketplace.driver.bidModal.validation.messageMaxLength', { max: 250 }) })
    .optional(),
});


// --- Mock API Hook ---
const useSubmitBidMutation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const mutate = async (data: { journeyId: string; bid: BidFormValues }) => {
    setIsLoading(true);
    console.log('Submitting bid:', data);
    await new Promise(resolve => setTimeout(resolve, 1500));
    // To test error: if (data.bid.bidAmount < 1000) throw new Error("Bid is too low for this journey.");
    setIsLoading(false);
    return { success: true };
  };
  return [mutate, { isLoading }] as const;
};


// --- Main Modal Component ---
const BidModal: React.FC<BidModalProps> = ({ journey, isOpen, onClose, onBidSubmitted }) => {
  const { t } = useTranslation();
  const bidSchema = getBidSchema(t);
  const [submitBid, { isLoading }] = useSubmitBidMutation();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<BidFormValues>({
    resolver: zodResolver(bidSchema),
  });

  // Reset form when modal is closed or journey changes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        reset({ bidAmount: undefined, message: '' });
      }, 300); // Delay reset until after exit animation
    } else {
       reset({ bidAmount: journey?.maxPrice || undefined, message: '' });
    }
  }, [isOpen, journey, reset]);

  const onSubmit: SubmitHandler<BidFormValues> = async (data) => {
    if (!journey) return;
    
    toast.promise(
      submitBid({ journeyId: journey.id, bid: data }),
      {
        loading: t('common.submitting'),
        success: () => {
          onBidSubmitted(); // Call parent callback
          onClose(); // Close modal
          return t('marketplace.driver.bidSuccessToast');
        },
        error: (err) => t('marketplace.driver.bidErrorToast', { message: err.message || 'Unknown error' }),
      }
    );
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
            initial={{ y: 50, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('marketplace.driver.bidModal.title')}</h2>
              <button
                onClick={onClose}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label={t('common.close')}
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {t('marketplace.driver.bidModal.subtitle', { passenger: journey.passengerName })}
            </p>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="bidAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('marketplace.driver.bidModal.bidAmountLabel')} ({journey.currency})
                </label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="bidAmount"
                    type="number"
                    {...register('bidAmount', { valueAsNumber: true })}
                    placeholder={t('marketplace.driver.bidModal.bidAmountPlaceholder', { amount: journey.maxPrice || 10000 })}
                    className={`form-input w-full pl-10 ${errors.bidAmount ? 'border-red-500' : ''}`}
                    disabled={isLoading}
                  />
                </div>
                {errors.bidAmount && <p className="mt-1 text-xs text-red-500">{errors.bidAmount.message}</p>}
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('marketplace.driver.bidModal.messageLabel')} ({t('common.optional')})
                </label>
                <textarea
                  id="message"
                  {...register('message')}
                  rows={3}
                  placeholder={t('marketplace.driver.bidModal.messagePlaceholder')}
                  className={`form-textarea w-full mt-1 ${errors.message ? 'border-red-500' : ''}`}
                  disabled={isLoading}
                />
                {errors.message && <p className="mt-1 text-xs text-red-500">{errors.message.message}</p>}
              </div>
              <div className="flex justify-end pt-4 space-x-3">
                <button type="button" onClick={onClose} className="btn-secondary" disabled={isLoading}>
                  {t('common.cancel')}
                </button>
                <button type="submit" disabled={isLoading || !isDirty} className="btn-primary flex items-center">
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

export default BidModal;
