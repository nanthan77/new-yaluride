import React, { useState, useEffect } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { User, Mail, Camera, Save, ArrowRight, ArrowLeft, Loader2, Briefcase, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- Placeholder for shared types ---
export enum UserRole {
  PASSENGER = 'PASSENGER',
  DRIVER = 'DRIVER',
  BOTH = 'BOTH',
  ADMIN = 'ADMIN',
}

// --- Zod Validation Schema ---
const profileCompletionSchema = z.object({
  name: z.string().min(3, { message: 'Full name must be at least 3 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  role: z.nativeEnum(UserRole, { errorMap: () => ({ message: 'Please select a role.' }) }),
  profilePicture: z
    .instanceof(FileList)
    .optional()
    .refine(files => !files || files.length === 0 || files[0].size <= 2 * 1024 * 1024, 'Max file size is 2MB.')
    .refine(files => !files || files.length === 0 || ['image/jpeg', 'image/png', 'image/webp'].includes(files[0].type), 'Only .jpg, .png, and .webp formats are accepted.'),
});

type ProfileCompletionValues = z.infer<typeof profileCompletionSchema>;

// --- Mock API Hook ---
const useUpdateProfileMutation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const mutate = async (data: FormData) => {
    setIsLoading(true);
    console.log('Submitting completed profile:', Object.fromEntries(data.entries()));
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
    return { success: true, user: { ...Object.fromEntries(data.entries()), id: 'user-123' } };
  };
  return [mutate, { isLoading }] as const;
};

// --- Sub-components for each step ---

const StepIndicator: React.FC<{ currentStep: number; totalSteps: number }> = ({ currentStep, totalSteps }) => {
  const { t } = useTranslation();
  return (
    <div className="mb-8">
      <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
        {t('onboarding.step', { current: currentStep, total: totalSteps })}
      </p>
      <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
        <motion.div
          className="bg-blue-600 h-1.5 rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
          transition={{ ease: "easeInOut", duration: 0.5 }}
        />
      </div>
    </div>
  );
};

const Step1_BasicInfo: React.FC<{ register: any; errors: any }> = ({ register, errors }) => {
    const { t } = useTranslation();
    return (
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('onboarding.step1.title')}</h2>
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('onboarding.step1.nameLabel')}</label>
                <div className="mt-1 relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input id="name" type="text" {...register('name')} className={`form-input w-full pl-10 ${errors.name ? 'border-red-500' : ''}`} placeholder={t('onboarding.step1.namePlaceholder')} />
                </div>
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('onboarding.step1.emailLabel')}</label>
                <div className="mt-1 relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input id="email" type="email" {...register('email')} className={`form-input w-full pl-10 ${errors.email ? 'border-red-500' : ''}`} placeholder={t('onboarding.step1.emailPlaceholder')} />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>
        </motion.div>
    );
};

const Step2_RoleSelection: React.FC<{ control: any; errors: any }> = ({ control, errors }) => {
    const { t } = useTranslation();
    return (
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('onboarding.step2.title')}</h2>
            <Controller
                name="role"
                control={control}
                render={({ field }) => (
                    <div className="space-y-4">
                        <RoleCard
                            role={UserRole.PASSENGER}
                            title={t('onboarding.step2.passengerTitle')}
                            description={t('onboarding.step2.passengerDesc')}
                            icon={UserCheck}
                            isSelected={field.value === UserRole.PASSENGER}
                            onClick={() => field.onChange(UserRole.PASSENGER)}
                        />
                        <RoleCard
                            role={UserRole.DRIVER}
                            title={t('onboarding.step2.driverTitle')}
                            description={t('onboarding.step2.driverDesc')}
                            icon={Briefcase}
                            isSelected={field.value === UserRole.DRIVER}
                            onClick={() => field.onChange(UserRole.DRIVER)}
                        />
                    </div>
                )}
            />
            {errors.role && <p className="mt-1 text-xs text-red-500">{errors.role.message}</p>}
        </motion.div>
    );
};

const RoleCard: React.FC<{ role: UserRole; title: string; description: string; icon: React.ElementType; isSelected: boolean; onClick: () => void; }> = ({ title, description, icon: Icon, isSelected, onClick }) => (
    <motion.div
        onClick={onClick}
        className={`p-6 border-2 rounded-lg cursor-pointer transition-all duration-200 ${isSelected ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-300 dark:border-gray-700 hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
        whileTap={{ scale: 0.98 }}
    >
        <div className="flex items-center">
            <Icon className={`h-8 w-8 mr-4 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
            <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
            </div>
        </div>
    </motion.div>
);


const Step3_ProfilePicture: React.FC<{ register: any; errors: any; watch: any }> = ({ register, errors, watch }) => {
    const { t } = useTranslation();
    const [preview, setPreview] = useState<string | null>(null);
    const profilePictureFile = watch('profilePicture');

    useEffect(() => {
        if (profilePictureFile && profilePictureFile.length > 0) {
            const file = profilePictureFile[0];
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(file);
        } else {
            setPreview(null);
        }
    }, [profilePictureFile]);

    return (
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('onboarding.step3.title')}</h2>
            <div className="flex flex-col items-center space-y-4">
                <div className="h-40 w-40 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                    {preview ? (
                        <img src={preview} alt="Profile preview" className="h-full w-full object-cover" />
                    ) : (
                        <Camera className="h-16 w-16 text-gray-400" />
                    )}
                </div>
                <label htmlFor="profile-picture-upload" className="btn-secondary cursor-pointer">
                    {t('onboarding.step3.uploadButton')}
                </label>
                <input id="profile-picture-upload" type="file" className="sr-only" {...register('profilePicture')} accept="image/png, image/jpeg, image/webp" />
                {errors.profilePicture && <p className="mt-1 text-xs text-red-500">{errors.profilePicture.message}</p>}
                <p className="text-xs text-gray-500">{t('onboarding.step3.skipInfo')}</p>
            </div>
        </motion.div>
    );
};

// --- Main Page Component ---
const CompleteProfilePage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 3;
    const [updateProfile, { isLoading }] = useUpdateProfileMutation();

    const {
        register,
        handleSubmit,
        trigger,
        control,
        watch,
        formState: { errors },
    } = useForm<ProfileCompletionValues>({
        resolver: zodResolver(profileCompletionSchema),
        mode: 'onChange',
    });

    const handleNextStep = async () => {
        let fieldsToValidate: (keyof ProfileCompletionValues)[] = [];
        if (currentStep === 1) fieldsToValidate = ['name', 'email'];
        if (currentStep === 2) fieldsToValidate = ['role'];

        const isValid = await trigger(fieldsToValidate);
        if (isValid) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handlePrevStep = () => {
        setCurrentStep(prev => prev - 1);
    };

    const onSubmit: SubmitHandler<ProfileCompletionValues> = async (data) => {
        if (currentStep !== totalSteps) return;

        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            if (key === 'profilePicture' && value && (value as FileList).length > 0) {
                formData.append(key, (value as FileList)[0]);
            } else if (value !== null && value !== undefined) {
                formData.append(key, String(value));
            }
        });

        try {
            await updateProfile(formData);
            toast.success(t('onboarding.successToast'));
            navigate('/dashboard'); // Redirect to dashboard after successful profile completion
        } catch (error: any) {
            toast.error(t('onboarding.errorToast', { message: error.message || 'Unknown error' }));
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
                <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
                <form onSubmit={handleSubmit(onSubmit)}>
                    <AnimatePresence mode="wait">
                        {currentStep === 1 && <Step1_BasicInfo key={1} register={register} errors={errors} />}
                        {currentStep === 2 && <Step2_RoleSelection key={2} control={control} errors={errors} />}
                        {currentStep === 3 && <Step3_ProfilePicture key={3} register={register} errors={errors} watch={watch} />}
                    </AnimatePresence>

                    <div className="mt-8 flex justify-between items-center">
                        {currentStep > 1 ? (
                            <button type="button" onClick={handlePrevStep} className="btn-secondary flex items-center">
                                <ArrowLeft className="h-5 w-5 mr-2" />
                                {t('common.back')}
                            </button>
                        ) : (
                            <div /> // Placeholder to keep the "Next" button on the right
                        )}

                        {currentStep < totalSteps ? (
                            <button type="button" onClick={handleNextStep} className="btn-primary flex items-center">
                                {t('common.next')}
                                <ArrowRight className="h-5 w-5 ml-2" />
                            </button>
                        ) : (
                            <button type="submit" disabled={isLoading} className="btn-primary flex items-center">
                                {isLoading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                                {isLoading ? t('common.saving') : t('onboarding.finishButton')}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CompleteProfilePage;
