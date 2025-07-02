import React, { useState, useCallback, Fragment } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Shield, CheckCircle, UploadCloud, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';

// --- Mock Data & Types (Replace with actual imports) ---
enum UserRole {
  PASSENGER = 'PASSENGER',
  DRIVER = 'DRIVER',
  BOTH = 'BOTH',
}

interface UserProfile {
  id: string;
  display_name: string;
  email: string;
  phone_number: string;
  photo_url?: string;
  role: UserRole;
  is_gn_verified: boolean;
  is_license_verified: boolean;
}

const useMockUserProfile = (): { profile: UserProfile | null; isLoading: boolean } => ({
  isLoading: false,
  profile: {
    id: 'user-123',
    display_name: 'Nanthan Gopal',
    email: 'nanthan.g@yaluride.lk',
    phone_number: '+94771234567',
    photo_url: 'https://i.pravatar.cc/150?u=user123',
    role: UserRole.DRIVER, // Change to DRIVER or BOTH to see verification tab
    is_gn_verified: false,
    is_license_verified: true,
  },
});

type ProfileFormInputs = {
  display_name: string;
  email: string;
};

type SecurityFormInputs = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

// --- UI Components (Placeholders for 21st.dev or shadcn/ui) ---
const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode, isLoading?: boolean }> = ({ children, className, isLoading, ...props }) => (
    <button
        className={`inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 ${className}`}
        disabled={isLoading}
        {...props}
    >
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {children}
    </button>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input {...props} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
);

// --- Sub-Components for each Tab ---

const ProfileSettingsTab: React.FC<{ profile: UserProfile }> = ({ profile }) => {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const { register, handleSubmit, formState: { errors } } = useForm<ProfileFormInputs>({
        defaultValues: {
            display_name: profile.display_name,
            email: profile.email,
        }
    });

    const onSubmit: SubmitHandler<ProfileFormInputs> = async (data) => {
        setIsLoading(true);
        toast.loading(t('profile.updating'));
        console.log("Updating profile with:", data);
        await new Promise(res => setTimeout(res, 1500));
        toast.dismiss();
        toast.success(t('profile.updateSuccess'));
        setIsLoading(false);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                    <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('profile.displayName')}</label>
                    <Input id="display_name" type="text" {...register('display_name', { required: t('validation.nameRequired') })} />
                    {errors.display_name && <p className="text-xs text-red-500 mt-1">{errors.display_name.message}</p>}
                </div>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('profile.email')}</label>
                    <Input id="email" type="email" {...register('email', { required: t('validation.emailRequired'), pattern: { value: /^\S+@\S+$/i, message: t('validation.invalidEmail') } })} />
                    {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                </div>
                 <div>
                    <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('profile.phoneNumber')}</label>
                    <Input id="phone_number" type="tel" value={profile.phone_number} disabled className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed" />
                </div>
                <div className="text-right">
                    <Button type="submit" isLoading={isLoading}>{t('common.saveChanges')}</Button>
                </div>
            </form>
        </motion.div>
    );
};

const SecuritySettingsTab: React.FC = () => {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const { register, handleSubmit, formState: { errors }, watch, reset } = useForm<SecurityFormInputs>();
    const newPassword = watch("newPassword");

    const onSubmit: SubmitHandler<SecurityFormInputs> = async (data) => {
        setIsLoading(true);
        toast.loading(t('profile.security.updatingPassword'));
        console.log("Changing password for user...");
        await new Promise(res => setTimeout(res, 1500));
        toast.dismiss();
        toast.success(t('profile.security.updateSuccess'));
        setIsLoading(false);
        reset();
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('profile.security.currentPassword')}</label>
                    <Input id="currentPassword" type="password" {...register('currentPassword', { required: t('validation.currentPasswordRequired') })} />
                    {errors.currentPassword && <p className="text-xs text-red-500 mt-1">{errors.currentPassword.message}</p>}
                </div>
                <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('profile.security.newPassword')}</label>
                    <Input id="newPassword" type="password" {...register('newPassword', { required: t('validation.newPasswordRequired'), minLength: { value: 8, message: t('validation.passwordMinLength', { length: 8 }) } })} />
                    {errors.newPassword && <p className="text-xs text-red-500 mt-1">{errors.newPassword.message}</p>}
                </div>
                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('profile.security.confirmPassword')}</label>
                    <Input id="confirmPassword" type="password" {...register('confirmPassword', { required: t('validation.confirmPasswordRequired'), validate: value => value === newPassword || t('validation.passwordsDontMatch') })} />
                    {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
                </div>
                <div className="text-right">
                    <Button type="submit" isLoading={isLoading}>{t('profile.security.changePasswordButton')}</Button>
                </div>
            </form>
        </motion.div>
    );
};

const VerificationTab: React.FC<{ profile: UserProfile }> = ({ profile }) => {
    const { t } = useTranslation();
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [licenseFile, setLicenseFile] = useState<File | null>(null);
    const [vehicleRegFile, setVehicleRegFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = async () => {
        if (!avatarFile && !licenseFile && !vehicleRegFile) {
            toast.error(t('profile.verification.noFiles'));
            return;
        }
        setIsUploading(true);
        toast.loading(t('profile.verification.uploading'));

        // Simulate upload process
        await new Promise(res => setTimeout(res, 2000));

        toast.dismiss();
        toast.success(t('profile.verification.uploadSuccess'));
        setIsUploading(false);
        setAvatarFile(null);
        setLicenseFile(null);
        setVehicleRegFile(null);
    };

    const FileDropzone: React.FC<{ file: File | null, setFile: (file: File | null) => void, label: string, acceptedTypes: string }> = ({ file, setFile, label, acceptedTypes }) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                    <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                    {file ? (
                        <div className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center">
                           <FileText size={16} className="mr-2"/> {file.name} ({(file.size / 1024).toFixed(2)} KB)
                           <button onClick={() => setFile(null)} className="ml-2 text-red-500 hover:text-red-700"><X size={14}/></button>
                        </div>
                    ) : (
                        <div className="flex text-sm text-gray-600 dark:text-gray-400">
                            <label htmlFor={`file-upload-${label}`} className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                <span>{t('profile.verification.uploadFile')}</span>
                                <input id={`file-upload-${label}`} name={`file-upload-${label}`} type="file" className="sr-only" accept={acceptedTypes} onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} />
                            </label>
                            <p className="pl-1">{t('profile.verification.dragAndDrop')}</p>
                        </div>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-500">{acceptedTypes.replace(/,/g, ', ')}</p>
                </div>
            </div>
        </div>
    );

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
            {/* Avatar Upload */}
            <FileDropzone file={avatarFile} setFile={setAvatarFile} label={t('profile.verification.profilePicture')} acceptedTypes="image/png, image/jpeg" />

            {/* Driver-specific verification */}
            {(profile.role === UserRole.DRIVER || profile.role === UserRole.BOTH) && (
                <div className="space-y-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                     <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('profile.verification.driverDocsTitle')}</h3>
                     <FileDropzone file={licenseFile} setFile={setLicenseFile} label={t('profile.verification.drivingLicense')} acceptedTypes="image/png, image/jpeg, application/pdf" />
                     <FileDropzone file={vehicleRegFile} setFile={setVehicleRegFile} label={t('profile.verification.vehicleRegistration')} acceptedTypes="image/png, image/jpeg, application/pdf" />
                </div>
            )}
            
            <div className="text-right">
                <Button onClick={handleFileUpload} isLoading={isUploading}>{t('profile.verification.submitButton')}</Button>
            </div>
        </motion.div>
    );
};


// --- Main Profile Page Component ---
const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'verification'>('profile');
  const { profile, isLoading } = useMockUserProfile();

  const tabs = [
    { id: 'profile', label: t('profile.tabs.profile'), icon: User },
    { id: 'security', label: t('profile.tabs.security'), icon: Shield },
    { id: 'verification', label: t('profile.tabs.verification'), icon: CheckCircle },
  ];

  if (isLoading) {
    return <GlobalSpinner message={t('common.loadingProfile')} />;
  }

  if (!profile) {
    return <div className="p-8 text-center text-red-500">{t('errors.profileNotFound')}</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center space-x-4 mb-8">
          <img src={profile.photo_url || `https://i.pravatar.cc/150?u=${profile.id}`} alt={profile.display_name} className="h-20 w-20 rounded-full object-cover border-4 border-white dark:border-gray-700 shadow-lg" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{profile.display_name}</h1>
            <p className="text-md text-gray-500 dark:text-gray-400">{profile.email}</p>
          </div>
        </div>
      </motion.div>

      <div>
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
                  }`}
              >
                <tab.icon className={`-ml-0.5 mr-2 h-5 w-5 ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'profile' && <ProfileSettingsTab profile={profile} />}
              {activeTab === 'security' && <SecuritySettingsTab />}
              {activeTab === 'verification' && <VerificationTab profile={profile} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
