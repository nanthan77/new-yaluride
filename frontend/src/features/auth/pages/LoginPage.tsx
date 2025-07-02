import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { AtSign, Lock, LogIn, Loader2 } from 'lucide-react';

// In a real app, these would come from a shared UI library like '21st.dev' or './components/ui'
// For this file, they are defined locally to demonstrate structure and styling.
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 sm:p-10 ${className}`}>{children}</div>
);
const CardHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-center mb-8">{children}</div>
);
const CardTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{children}</h1>
);
const CardDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{children}</p>
);
const CardContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="space-y-6">{children}</div>
);
const CardFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-8">{children}</div>
);
const InputGroup: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`relative ${className}`}>{children}</div>
);
const InputIcon: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{children}</div>
);
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
    <input
        className={`w-full h-12 pl-10 pr-4 bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white ${className}`}
        ref={ref}
        {...props}
    />
));
const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode, isLoading?: boolean }> = ({ children, className, isLoading, ...props }) => (
    <button
        className={`w-full h-12 flex items-center justify-center bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        disabled={isLoading}
        {...props}
    >
        {isLoading ? <Loader2 className="animate-spin" /> : children}
    </button>
);


// --- Login Form Data Type ---
type LoginFormInputs = {
  phoneNumber: string;
  password: string;
};

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>({
    mode: 'onBlur', // Validate on blur for better UX
  });

  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    setIsLoading(true);
    console.log('Login attempt with:', data);
    
    // In a real application, you would dispatch a Redux thunk here
    // e.g., dispatch(loginUser(data)).unwrap().then(...).catch(...);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulate success/failure
    if (data.password === 'password123') {
      toast.success(t('auth.loginSuccess'));
      navigate('/dashboard'); // Redirect to dashboard on successful login
    } else {
      toast.error(t('auth.error.invalidCredentials'));
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('auth.loginTitle')}</CardTitle>
        <CardDescription>{t('auth.loginSubtitle', { appName: 'YALURIDE' })}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Phone Number Field */}
          <div className="space-y-1">
            <label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('auth.phoneNumberLabel')}</label>
            <InputGroup>
              <InputIcon><AtSign size={18} /></InputIcon>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="+94771234567"
                autoComplete="tel"
                {...register('phoneNumber', {
                  required: t('auth.validation.phoneNumberRequired'),
                  pattern: {
                    value: /^(?:\+94|0)?(7[0-9]{8})$/,
                    message: t('auth.validation.phoneNumberInvalid'),
                  },
                })}
                className={errors.phoneNumber ? 'border-red-500 focus:ring-red-500' : ''}
              />
            </InputGroup>
            {errors.phoneNumber && <p className="text-xs text-red-500 mt-1">{errors.phoneNumber.message}</p>}
          </div>

          {/* Password Field */}
          <div className="space-y-1">
             <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('auth.passwordLabel')}</label>
                <Link to="/auth/forgot-password" className="text-xs text-blue-600 hover:underline dark:text-blue-400">
                    {t('auth.forgotPasswordLink')}
                </Link>
             </div>
            <InputGroup>
                <InputIcon><Lock size={18} /></InputIcon>
                <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    {...register('password', {
                        required: t('auth.validation.passwordRequired'),
                    })}
                    className={errors.password ? 'border-red-500 focus:ring-red-500' : ''}
                />
            </InputGroup>
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
          </div>

          <Button type="submit" isLoading={isLoading}>
            <LogIn size={20} className="mr-2" />
            {t('auth.loginButton')}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        {t('auth.noAccountPrompt')}{' '}
        <Link to="/auth/signup" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
          {t('auth.signUpLink')}
        </Link>
      </CardFooter>
    </Card>
  );
};

export default LoginPage;
