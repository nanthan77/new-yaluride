import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Mail, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';
import AuthLayout from '../../../components/layout/AuthLayout';

// --- Form Data Type ---
interface ForgotPasswordFormData {
  email: string;
}

/**
 * ForgotPasswordPage component.
 * Allows users to request a password reset link to be sent to their email.
 */
const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>();

  /**
   * Handles the form submission to request a password reset.
   * @param {ForgotPasswordFormData} data - The form data containing the user's email.
   */
  const onSubmit: SubmitHandler<ForgotPasswordFormData> = async (data) => {
    setIsLoading(true);
    toast.loading(t('forgotPassword.loading'));

    try {
      // Construct the redirect URL for the password reset link
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: redirectUrl,
      });

      toast.dismiss();

      if (error) {
        // Supabase might throw errors for various reasons (e.g., user not found, rate limiting)
        // For security, we show a generic success message unless it's a clear server error.
        console.error('Password reset request error:', error);
        if (error.message.includes('rate limit')) {
          toast.error(t('forgotPassword.error.rateLimit'));
        } else {
          // Fallback to generic success message to prevent user enumeration
          setIsSubmitted(true);
        }
      } else {
        // On success, show the confirmation message
        setIsSubmitted(true);
      }
    } catch (err: any) {
      toast.dismiss();
      toast.error(t('forgotPassword.error.generic'));
      console.error('Unexpected error during password reset request:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
  };

  return (
    <AuthLayout>
      <div className="w-full">
        <AnimatePresence mode="wait">
          {isSubmitted ? (
            <motion.div
              key="success"
              variants={formVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="text-center p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg"
            >
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('forgotPassword.success.title')}
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                {t('forgotPassword.success.message')}
              </p>
              <Link
                to="/login"
                className="mt-6 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <ArrowLeft size={16} className="mr-1" />
                {t('common.backToLogin')}
              </Link>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              variants={formVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t('forgotPassword.title')}
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {t('forgotPassword.subtitle')}
                </p>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-left">
                    {t('common.emailAddress')}
                  </label>
                  <div className="mt-1 relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </span>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      {...register('email', {
                        required: t('validation.email.required') as string,
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: t('validation.email.invalid'),
                        },
                      })}
                      className={`form-input pl-10 ${errors.email ? 'border-red-500' : ''}`}
                      placeholder={t('common.emailPlaceholder') || 'you@example.com'}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400 text-left">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full btn-primary flex items-center justify-center disabled:opacity-50"
                  >
                    {isLoading && <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />}
                    {isLoading ? t('forgotPassword.sending') : t('forgotPassword.sendLinkButton')}
                  </button>
                </div>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {t('common.backToLogin')}
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
