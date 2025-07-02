import React, { useState, useEffect, useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';
import AuthLayout from '../../../components/layout/AuthLayout';

// --- Validation Schema ---
const createPasswordSchema = (t: (key: string) => string) =>
  z.object({
    password: z.string()
      .min(8, { message: t('validation.password.minLength') })
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
        message: t('validation.password.complexity'),
      }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: t('validation.password.mustMatch'),
    path: ['confirmPassword'], // Set the error on the confirmPassword field
  });

type PasswordFormData = z.infer<ReturnType<typeof createPasswordSchema>>;

// --- Password Strength Sub-component ---
const PasswordStrengthIndicator: React.FC<{ password?: string }> = ({ password = '' }) => {
  const { t } = useTranslation();
  const getStrength = useCallback(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[\W_]/.test(password)) score++;
    return score;
  }, [password]);

  const strength = getStrength();
  const strengthText = [
    t('passwordStrength.veryWeak'),
    t('passwordStrength.weak'),
    t('passwordStrength.medium'),
    t('passwordStrength.strong'),
    t('passwordStrength.veryStrong'),
  ][strength - 1] || '';

  const color = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-blue-500',
    'bg-green-500',
  ][strength - 1] || 'bg-gray-200';

  return (
    <div className="mt-2 space-y-1">
      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
        <motion.div
          className={`h-1.5 rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${(strength / 5) * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      {password && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-right">{strengthText}</p>
      )}
    </div>
  );
};

// --- Main Reset Password Page Component ---
const ResetPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Extract access token from URL fragment on mount
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.substring(1)); // Remove '#'
    const token = params.get('access_token');

    if (token) {
      setAccessToken(token);
      // The Supabase client will automatically pick this up for the updateUser call
    } else {
      toast.error(t('resetPassword.error.noToken'));
      navigate('/login', { replace: true });
    }
  }, [navigate, t]);

  const passwordSchema = createPasswordSchema(t);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    mode: 'onChange',
  });

  const passwordValue = watch('password');

  const onSubmit: SubmitHandler<PasswordFormData> = async (data) => {
    if (!accessToken) {
      toast.error(t('resetPassword.error.noToken'));
      return;
    }
    setIsLoading(true);
    setError(null);
    toast.loading(t('resetPassword.loading'));

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      });

      toast.dismiss();
      if (updateError) throw updateError;

      toast.success(t('resetPassword.success.message'));
      setIsSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } catch (err: any) {
      toast.dismiss();
      const errorMessage = err.message || t('resetPassword.error.generic');
      toast.error(errorMessage);
      setError(errorMessage);
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
          {isSuccess ? (
            <motion.div
              key="success"
              variants={formVariants}
              initial="hidden"
              animate="visible"
              className="text-center p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg"
            >
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('resetPassword.success.title')}</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{t('resetPassword.success.redirecting')}</p>
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
                <KeyRound className="mx-auto h-12 w-12 text-blue-600 dark:text-blue-400" />
                <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">{t('resetPassword.title')}</h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t('resetPassword.subtitle')}</p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-200 rounded-md text-sm text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-left">{t('common.newPassword')}</label>
                  <div className="mt-1 relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      {...register('password')}
                      className={`form-input pr-10 ${errors.password ? 'border-red-500' : ''}`}
                      placeholder="••••••••"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      aria-label={showPassword ? t('common.hidePassword') : t('common.showPassword')}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <PasswordStrengthIndicator password={passwordValue} />
                  {errors.password && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{errors.password.message}</p>}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-left">{t('common.confirmNewPassword')}</label>
                  <div className="mt-1">
                    <input
                      id="confirmPassword"
                      type="password"
                      {...register('confirmPassword')}
                      className={`form-input ${errors.confirmPassword ? 'border-red-500' : ''}`}
                      placeholder="••••••••"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.confirmPassword && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{errors.confirmPassword.message}</p>}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading || !isValid}
                    className="w-full btn-primary flex items-center justify-center disabled:opacity-50"
                  >
                    {isLoading && <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />}
                    {isLoading ? t('resetPassword.resetting') : t('resetPassword.resetButton')}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AuthLayout>
  );
};

export default ResetPasswordPage;
