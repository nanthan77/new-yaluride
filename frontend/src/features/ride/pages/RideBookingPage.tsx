import React, { useState } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { MapPin, ArrowRight, Loader2, Shield, Info, Users, Car } from 'lucide-react';

// --- Placeholder Imports & Mocks ---
// In a real app, these would be from your store and API slices
import { useAppSelector } from '../../../store/hooks';
import { UserGender } from '../../../types/yaluride'; // Assuming a shared enum/type for gender

// Mock user selector
const useCurrentUser = () => {
  // This hook simulates fetching the current user from the Redux store.
  // In a real app: return useAppSelector(selectUser);
  return {
    id: 'user-123',
    name: 'Jane Doe',
    gender: UserGender.FEMALE, // Change to MALE or OTHER to test conditional rendering
  };
};

// Mock API mutation hook
const useCreateRideRequestMutation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const mutate = async (data: any) => {
    setIsLoading(true);
    console.log('Submitting Ride Request:', data);
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast.success('Ride request submitted successfully!');
    setIsLoading(false);
    return { success: true, rideId: `ride_${crypto.randomUUID()}` };
  };
  return [mutate, { isLoading }] as const;
};
// --- End Mocks ---

// --- Zod Validation Schema ---
const rideBookingSchema = z.object({
  pickupLocation: z.string().min(5, { message: 'Pickup location must be at least 5 characters.' }),
  destination: z.string().min(5, { message: 'Destination must be at least 5 characters.' }),
  isWomenOnly: z.boolean().default(false),
  voucherCode: z
    .string()
    .min(3, { message: 'Invalid voucher code.' })
    .optional()
    .or(z.literal('')),
});

type RideBookingFormValues = z.infer<typeof rideBookingSchema>;

// --- Reusable UI Components ---
const InputWithIcon = React.forwardRef<HTMLInputElement, any>(({ label, name, error, icon: Icon, ...props }, ref) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Icon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input id={name} name={name} ref={ref} className={`form-input w-full pl-10 ${error ? 'border-red-500' : ''}`} {...props} />
        </div>
        {error && <p className="mt-1 text-xs text-red-500">{error.message}</p>}
    </div>
));

const ToggleSwitch = ({ label, name, control, tooltipText }: { label: string; name: string; control: any; tooltipText: string }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    return (
        <div className="flex items-center justify-between">
            <span className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                <Shield className="h-5 w-5 mr-2 text-pink-500" />
                {label}
                <div className="relative ml-2 flex items-center">
                    <button type="button" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)} onFocus={() => setShowTooltip(true)} onBlur={() => setShowTooltip(false)} className="cursor-pointer">
                        <Info size={16} className="text-gray-400 hover:text-gray-600" />
                    </button>
                    {showTooltip && (
                        <div className="absolute bottom-full mb-2 w-64 p-2 text-xs text-white bg-gray-800 rounded-md shadow-lg z-10">
                            {tooltipText}
                        </div>
                    )}
                </div>
            </span>
            <Controller
                name={name}
                control={control}
                render={({ field: { onChange, value } }) => (
                    <button
                        type="button"
                        role="switch"
                        aria-checked={value}
                        onClick={() => onChange(!value)}
                        className={`${value ? 'bg-pink-500' : 'bg-gray-300 dark:bg-gray-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800`}
                    >
                        <span
                            aria-hidden="true"
                            className={`${value ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                        />
                    </button>
                )}
            />
        </div>
    );
};


// --- Main Ride Booking Page Component ---
const RideBookingPage: React.FC = () => {
    const { t } = useTranslation();
    const currentUser = useCurrentUser();
    const [createRideRequest, { isLoading }] = useCreateRideRequestMutation();
    // Voucher handling state
    const [voucherApplied, setVoucherApplied] = useState(false);
    const [voucherDiscount, setVoucherDiscount] = useState<number | null>(null);

    // --- Mock validate voucher hook ---
    const useValidateVoucherMutation = () => {
      const [isValidating, setIsValidating] = useState(false);
      const mutate = async ({ code }: { code: string }) => {
        setIsValidating(true);
        await new Promise(r => setTimeout(r, 800));
        setIsValidating(false);
        // Simple mock: codes starting with SAVE are valid
        if (code.startsWith('SAVE')) {
          return { valid: true, discount: 500 };
        }
        throw new Error('Invalid voucher code');
      };
      return [mutate, { isLoading: isValidating }] as const;
    };

    const [validateVoucher, { isLoading: isValidatingVoucher }] =
      useValidateVoucherMutation();

    const { register, handleSubmit, control, formState: { errors } } = useForm<RideBookingFormValues>({
        resolver: zodResolver(rideBookingSchema),
        defaultValues: {
            pickupLocation: '',
            destination: '',
            isWomenOnly: false,
            voucherCode: '',
        },
    });

    const onSubmit: SubmitHandler<RideBookingFormValues> = async (data) => {
        // attach voucher info if applied
        if (voucherApplied) {
          data.voucherCode = watch('voucherCode');
        } else {
          delete (data as any).voucherCode;
        }
        try {
            await createRideRequest(data);
            // Handle post-submission logic, e.g., navigating to a "searching for driver" screen
        } catch (error: any) {
            toast.error(t('rideBooking.error.submitFailed', { message: error.message }));
        }
    };

    const handleApplyVoucher = async () => {
      const code = watch('voucherCode').trim();
      if (!code) {
        toast.error('Enter a voucher code');
        return;
      }
      try {
        const res = await validateVoucher({ code });
        setVoucherApplied(true);
        setVoucherDiscount(res.discount);
        toast.success(`Voucher applied! Discount: Rs ${res.discount}`);
      } catch (err: any) {
        setVoucherApplied(false);
        setVoucherDiscount(null);
        toast.error(err.message || 'Invalid voucher');
      }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col lg:flex-row h-full min-h-screen"
        >
            {/* Left Panel: Booking Form */}
            <div className="w-full lg:w-1/3 xl:w-1/4 p-6 lg:p-8 bg-white dark:bg-gray-800 flex flex-col justify-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('rideBooking.title')}</h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">{t('rideBooking.subtitle')}</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
                    <InputWithIcon
                        label={t('rideBooking.fromLabel')}
                        name="pickupLocation"
                        type="text"
                        placeholder={t('rideBooking.fromPlaceholder')}
                        icon={MapPin}
                        register={register}
                        error={errors.pickupLocation}
                    />

                    <InputWithIcon
                        label={t('rideBooking.toLabel')}
                        name="destination"
                        type="text"
                        placeholder={t('rideBooking.toPlaceholder')}
                        icon={MapPin}
                        register={register}
                        error={errors.destination}
                    />

                    {/* Vehicle Type Selection (Example) */}
                    <div>
                        <label htmlFor="vehicleType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('rideBooking.vehicleTypeLabel')}</label>
                        <select id="vehicleType" name="vehicleType" className="mt-1 form-select w-full">
                            <option>{t('vehicle.car')}</option>
                            <option>{t('vehicle.van')}</option>
                            <option>{t('vehicle.tukTuk')}</option>
                        </select>
                    </div>

                    {/* Women-Only Ride Toggle - Conditionally Rendered */}
                    {currentUser?.gender === UserGender.FEMALE && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                            <ToggleSwitch
                                label={t('rideBooking.womenOnly.label')}
                                name="isWomenOnly"
                                control={control}
                                tooltipText={t('rideBooking.womenOnly.tooltip')}
                            />
                        </motion.div>
                    )}

                    {/* Voucher Code Input */}
                    <div className="space-y-2">
                      <InputWithIcon
                        label="Voucher Code"
                        name="voucherCode"
                        type="text"
                        placeholder="Enter code"
                        icon={Users}
                        ref={register('voucherCode').ref}
                        error={errors.voucherCode}
                        {...register('voucherCode')}
                      />
                      <button
                        type="button"
                        onClick={handleApplyVoucher}
                        disabled={isValidatingVoucher}
                        className="btn-secondary w-full flex items-center justify-center"
                      >
                        {isValidatingVoucher ? (
                          <Loader2 className="animate-spin h-5 w-5 mr-2" />
                        ) : null}
                        {voucherApplied ? 'Applied' : 'Apply'}
                      </button>
                      {voucherApplied && voucherDiscount && (
                        <p className="text-sm text-green-600">Discount applied: Rs {voucherDiscount}</p>
                      )}
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary w-full flex items-center justify-center text-lg"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin h-6 w-6" />
                            ) : (
                                <>
                                    <span>{t('rideBooking.findRideButton')}</span>
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Right Panel: Map */}
            <div className="flex-1 h-64 lg:h-auto bg-gray-200 dark:bg-gray-900">
                {/* Placeholder for the actual map component */}
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                        <Map size={64} />
                        <p className="mt-4 font-semibold">{t('rideBooking.mapPlaceholder.title')}</p>
                        <p className="text-sm mt-1">{t('rideBooking.mapPlaceholder.subtitle')}</p>
                    </div>
                </div>
                {/* <MapComponent pickup={watch('pickupLocation')} destination={watch('destination')} /> */}
            </div>
        </motion.div>
    );
};

export default RideBookingPage;
