import React, { useState, useEffect } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { User, Mail, Phone, Camera, Save, LogOut, Shield, Bell, VenetianMask, Info, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// --- Zod Validation Schema ---
const profileSchema = z.object({
  name: z.string().min(3, { message: 'Name must be at least 3 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }).optional().or(z.literal('')),
  phone: z.string().min(10, { message: 'Invalid phone number.' }), // Read-only
  profilePicture: z.instanceof(FileList).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// --- Mock Data & Hooks (replace with actual RTK Query hooks) ---
const useUserProfileQuery = () => ({
  data: {
    name: 'Anura Perera',
    email: 'anura.p@example.com',
    phone: '+94771234567',
    profilePictureUrl: 'https://i.pravatar.cc/150?u=anura',
    gender: 'MALE',
  },
  isLoading: false,
  isError: false,
});

const useUpdateProfileMutation = () => {
  const [isLoading, setIsLoading] = React.useState(false);
  const mutate = async (data: FormData) => {
    setIsLoading(true);
    console.log('Updating profile with FormData:', Object.fromEntries(data.entries()));
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    return { success: true };
  };
  return [mutate, { isLoading }] as const;
};

// --- Reusable Form Components ---
const Input = React.forwardRef<HTMLInputElement, any>(({ label, name, error, icon: Icon, ...props }, ref) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
    <div className="mt-1 relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />}
      <input
        id={name}
        name={name}
        ref={ref}
        className={`form-input w-full ${Icon ? 'pl-10' : ''} ${props.disabled ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : ''} ${error ? 'border-red-500' : ''}`}
        {...props}
      />
    </div>
    {error && <p className="mt-2 text-sm text-red-500">{error.message}</p>}
  </div>
));

const Select = React.forwardRef<HTMLSelectElement, any>(({ label, name, error, icon: Icon, children, ...props }, ref) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <div className="mt-1 relative">
            {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />}
            <select
                id={name}
                name={name}
                ref={ref}
                className={`form-select w-full ${Icon ? 'pl-10' : ''} ${error ? 'border-red-500' : ''}`}
                {...props}
            >
                {children}
            </select>
        </div>
        {error && <p className="mt-2 text-sm text-red-500">{error.message}</p>}
    </div>
));

// --- Main Component ---
const UserProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: userProfile, isLoading: isProfileLoading } = useUserProfileQuery();
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
  const [imagePreview, setImagePreview] = React.useState<string | null>(userProfile?.profilePictureUrl || null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (userProfile) {
      reset({
        name: userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone,
        gender: userProfile.gender as any,
      });
      if (userProfile.profilePictureUrl) {
        setImagePreview(userProfile.profilePictureUrl);
      }
    }
  }, [userProfile, reset]);

  const profilePictureFile = watch('profilePicture');
  useEffect(() => {
    if (profilePictureFile && profilePictureFile.length > 0) {
      const file = profilePictureFile[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [profilePictureFile]);

  const onSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.email) formData.append('email', data.email);
    if (data.gender) formData.append('gender', data.gender);
    if (data.profilePicture && data.profilePicture.length > 0) {
      formData.append('profilePicture', data.profilePicture[0]);
    }
    
    toast.promise(
      updateProfile(formData),
      {
        loading: t('common.saving'),
        success: t('profile.updateSuccess'),
        error: (err) => t('profile.updateError', { message: err.message }),
      }
    );
  };

  if (isProfileLoading) {
    return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('profile.title')}</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t('profile.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-6 text-gray-800 dark:text-white">{t('profile.personalInfo.title')}</h2>
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Profile Picture */}
            <div className="relative flex-shrink-0">
              <img
                src={imagePreview || 'https://placehold.co/128x128/e2e8f0/a0aec0?text=You'}
                alt="Profile"
                className="h-32 w-32 rounded-full object-cover"
              />
              <label htmlFor="profile-picture-upload" className="absolute -bottom-1 -right-1 bg-blue-600 p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors border-4 border-white dark:border-gray-800">
                <Camera className="h-5 w-5 text-white" />
                <input id="profile-picture-upload" type="file" className="sr-only" {...register('profilePicture')} accept="image/png, image/jpeg, image/webp" />
              </label>
            </div>
            {/* Form Fields */}
            <div className="w-full space-y-4">
              <Input label={t('profile.personalInfo.name')} name="name" {...register('name')} error={errors.name} icon={User} />
              <Input label={t('profile.personalInfo.email')} name="email" type="email" {...register('email')} error={errors.email} icon={Mail} />
              <Input label={t('profile.personalInfo.phone')} name="phone" {...register('phone')} error={errors.phone} icon={Phone} disabled />
              <Select
                label={t('profile.personalInfo.gender.label')}
                name="gender"
                {...register('gender')}
                error={errors.gender}
                icon={VenetianMask}
              >
                <option value="PREFER_NOT_TO_SAY">{t('profile.personalInfo.gender.preferNotToSay')}</option>
                <option value="MALE">{t('profile.personalInfo.gender.male')}</option>
                <option value="FEMALE">{t('profile.personalInfo.gender.female')}</option>
                <option value="OTHER">{t('profile.personalInfo.gender.other')}</option>
              </Select>
              <div className="flex items-start text-xs text-gray-500 dark:text-gray-400 mt-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                <Info size={14} className="mr-2 mt-0.5 flex-shrink-0" />
                <p>{t('profile.personalInfo.gender.privacyNotice')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-6 text-gray-800 dark:text-white">{t('profile.settings.title')}</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3">
              <div className="flex items-center">
                <Shield className="h-6 w-6 mr-4 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{t('profile.settings.password.title')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('profile.settings.password.subtitle')}</p>
                </div>
              </div>
              <button type="button" className="btn-secondary">{t('profile.settings.password.button')}</button>
            </div>
            <div className="flex justify-between items-center p-3">
              <div className="flex items-center">
                <Bell className="h-6 w-6 mr-4 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{t('profile.settings.notifications.title')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('profile.settings.notifications.subtitle')}</p>
                </div>
              </div>
              <button type="button" className="btn-secondary">{t('profile.settings.notifications.button')}</button>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-6">
          <button type="button" className="btn-danger-outline">
            <LogOut className="h-4 w-4 mr-2" />
            {t('profile.actions.logout')}
          </button>
          <button type="submit" disabled={!isDirty || isUpdating} className="btn-primary">
            {isUpdating && <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />}
            {isUpdating ? t('common.saving') : t('profile.actions.saveChanges')}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default UserProfilePage;
