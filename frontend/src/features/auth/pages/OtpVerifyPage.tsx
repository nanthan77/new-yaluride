import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';
import { useAppDispatch } from '../../../store/hooks';
import { setAuth } from '../store/slices/authSlice';

const OTP_LENGTH = 6;

const OtpVerifyPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  // Extract phone number and email from navigation state
  const { phone, email } = location.state || {};
  const verificationTarget = phone || email;

  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(60);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const { value } = e.target;
    // Allow only single digit numbers
    if (!/^[0-9]$/.test(value) && value !== '') return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input if a digit is entered
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      // Move to previous input on backspace if current input is empty
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().slice(0, OTP_LENGTH);
    if (/^\d+$/.test(pastedData)) {
      const newOtp = pastedData.split('').concat(new Array(OTP_LENGTH).fill('')).slice(0, OTP_LENGTH);
      setOtp(newOtp);
      const lastFilledIndex = Math.min(pastedData.length, OTP_LENGTH - 1);
      inputRefs.current[lastFilledIndex]?.focus();
    }
  };

  const handleSubmit = useCallback(async () => {
    const fullOtp = otp.join('');
    if (fullOtp.length !== OTP_LENGTH) {
      setError(t('otp.error.incomplete'));
      return;
    }

    setIsLoading(true);
    setError(null);
    toast.loading(t('otp.verifying'));

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone,
        email: email,
        token: fullOtp,
        type: email ? 'email' : 'sms',
      });

      toast.dismiss();

      if (error) {
        throw error;
      }

      if (data.session) {
        toast.success(t('otp.success'));
        dispatch(setAuth({ user: data.user, session: data.session }));
        navigate('/dashboard', { replace: true });
      } else {
        throw new Error(t('otp.error.noSession'));
      }
    } catch (err: any) {
      toast.dismiss();
      const errorMessage = err.message || t('otp.error.generic');
      toast.error(errorMessage);
      setError(errorMessage);
      console.error('OTP Verification Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [otp, phone, email, navigate, dispatch, t]);

  // Auto-submit when all fields are filled
  useEffect(() => {
    if (otp.every(digit => digit !== '')) {
      handleSubmit();
    }
  }, [otp, handleSubmit]);


  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    toast.loading(t('otp.resending'));

    try {
        const { error } = await supabase.auth.resend({
            type: email ? 'signup' : 'sms',
            email: email,
            phone: phone,
        });

        toast.dismiss();
        if (error) throw error;
        
        toast.success(t('otp.resendSuccess'));
        setResendCooldown(60); // Reset cooldown
        setOtp(new Array(OTP_LENGTH).fill('')); // Clear inputs
        inputRefs.current[0]?.focus(); // Focus first input
    } catch (err: any) {
        toast.dismiss();
        const errorMessage = err.message || t('otp.error.resendFailed');
        toast.error(errorMessage);
        setError(errorMessage);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 shadow-xl rounded-2xl border border-gray-200 dark:border-gray-700">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
          <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">{t('otp.title')}</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {t('otp.subtitle', { target: verificationTarget })}
        </p>
      </motion.div>

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              pattern="[0-9]"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInputChange(e, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              disabled={isLoading}
              className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl sm:text-3xl font-semibold rounded-lg border transition-all duration-200
                ${error ? 'border-red-500 text-red-600 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'}
                bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800`}
            />
          ))}
        </div>

        {error && (
          <p className="mt-3 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="mt-6">
          <button
            type="submit"
            disabled={isLoading || otp.join('').length !== OTP_LENGTH}
            className="w-full btn-primary flex items-center justify-center disabled:opacity-50"
          >
            {isLoading && <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />}
            {isLoading ? t('otp.verifying') : t('otp.verifyButton')}
          </button>
        </div>
      </form>

      <div className="mt-4 text-center text-sm">
        <p className="text-gray-600 dark:text-gray-400">
          {t('otp.didNotReceive')}{' '}
          <button
            onClick={handleResendOtp}
            disabled={resendCooldown > 0 || isLoading}
            className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
          >
            {t('otp.resend')} {resendCooldown > 0 && `(${resendCooldown}s)`}
          </button>
        </p>
      </div>
    </div>
  );
};

export default OtpVerifyPage;
