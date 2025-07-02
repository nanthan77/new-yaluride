import React, { useState, useCallback, useMemo } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { FaFileUpload, FaFilePdf, FaFileImage, FaTrash, FaCheckCircle, FaExclamationCircle, FaHourglassHalf } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

// --- Mock/Placeholder Imports ---
// In a real application, these would be imported from their actual locations.
// Simulating the userApi hooks and User entity
const useGetProfileQuery = () => ({
  data: {
    // gn_verified_status: 'pending' // 'approved', 'rejected', 'pending', or null
  },
  isLoading: false,
  isFetching: false,
});

const useSubmitGNVerificationMutation = () => {
    const [isLoading, setIsLoading] = useState(false);
    const mutate = async (data: { gnDivisionId: string; documents: string[] }) => {
        setIsLoading(true);
        console.log('Submitting verification data:', data);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Simulate a random success or failure
        if (Math.random() > 0.1) { // 90% success rate
            setIsLoading(false);
            return { success: true, message: 'Verification documents submitted successfully.' };
        } else {
            setIsLoading(false);
            throw new Error('Failed to submit documents due to a server error.');
        }
    };
    return [mutate, { isLoading }];
};

// Simulating a storage upload function
async function uploadVerificationDocument(file: File): Promise<string> {
  console.log(`Uploading ${file.name}...`);
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000)); // Simulate upload time
  const mockUrl = `https://storage.yaluride.com/verification_documents/user_uuid_123/${file.name}`;
  console.log(`Uploaded ${file.name} to ${mockUrl}`);
  return mockUrl;
}
// --- End Mock/Placeholder Imports ---

interface IFormInput {
  gnDivisionId: string;
}

const FilePreview: React.FC<{ file: File; onRemove: () => void }> = ({ file, onRemove }) => {
  const fileIcon = useMemo(() => {
    if (file.type.includes('pdf')) return <FaFilePdf className="text-red-500 h-6 w-6" />;
    if (file.type.includes('image')) return <FaFileImage className="text-blue-500 h-6 w-6" />;
    return <FaFileUpload className="text-gray-500 h-6 w-6" />;
  }, [file.type]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="flex items-center justify-between p-2 my-1 bg-gray-100 dark:bg-gray-700 rounded-md"
    >
      <div className="flex items-center space-x-3">
        {fileIcon}
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate max-w-xs">
            {file.name}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {(file.size / 1024).toFixed(2)} KB
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="p-1 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-800 dark:hover:text-red-200 transition-colors"
        aria-label={`Remove ${file.name}`}
      >
        <FaTrash />
      </button>
    </motion.div>
  );
};

const StatusDisplay: React.FC<{ status: 'approved' | 'pending' | 'rejected', remarks?: string }> = ({ status, remarks }) => {
    const { t } = useTranslation();
    const statusConfig = {
        approved: {
            icon: <FaCheckCircle className="h-12 w-12 text-green-500" />,
            title: t('verification.status.approvedTitle'),
            message: t('verification.status.approvedMessage'),
            bgColor: 'bg-green-50 dark:bg-green-900/50',
            borderColor: 'border-green-300 dark:border-green-700',
        },
        pending: {
            icon: <FaHourglassHalf className="h-12 w-12 text-yellow-500 animate-pulse" />,
            title: t('verification.status.pendingTitle'),
            message: t('verification.status.pendingMessage'),
            bgColor: 'bg-yellow-50 dark:bg-yellow-900/50',
            borderColor: 'border-yellow-300 dark:border-yellow-700',
        },
        rejected: {
            icon: <FaExclamationCircle className="h-12 w-12 text-red-500" />,
            title: t('verification.status.rejectedTitle'),
            message: t('verification.status.rejectedMessage'),
            bgColor: 'bg-red-50 dark:bg-red-900/50',
            borderColor: 'border-red-300 dark:border-red-700',
        }
    };

    const currentStatus = statusConfig[status];

    return (
        <div className={`p-6 rounded-lg border ${currentStatus.bgColor} ${currentStatus.borderColor} text-center`}>
            <div className="flex justify-center mb-4">{currentStatus.icon}</div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{currentStatus.title}</h3>
            <p className="text-gray-600 dark:text-gray-300">{currentStatus.message}</p>
            {status === 'rejected' && remarks && (
                <div className="mt-4 p-3 bg-red-100 dark:bg-red-800/50 rounded-md text-left">
                    <p className="font-semibold text-red-800 dark:text-red-200">{t('verification.status.rejectionReason')}:</p>
                    <p className="text-sm text-red-700 dark:text-red-300">{remarks}</p>
                </div>
            )}
        </div>
    );
};


export const VerificationPage: React.FC = () => {
  const { t } = useTranslation();
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const { data: profile, isLoading: isLoadingProfile } = useGetProfileQuery();
  const [submitVerification, { isLoading: isSubmitting }] = useSubmitGNVerificationMutation();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isValid },
    reset,
  } = useForm<IFormInput>({ mode: 'onChange' });

  const onFileChange = useCallback((selectedFiles: FileList | null) => {
    if (selectedFiles) {
      const newFiles = Array.from(selectedFiles);
      // You might want to add validation for file types, size, or count here
      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    }
  }, []);

  const handleRemoveFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    onFileChange(event.dataTransfer.files);
  }, [onFileChange]);

  const onSubmit: SubmitHandler<IFormInput> = async (data) => {
    if (files.length === 0) {
      toast.error(t('verification.error.noFiles'));
      return;
    }

    setIsUploading(true);
    const uploadToastId = toast.loading(t('verification.toast.uploading'));

    try {
      const documentUrls = await Promise.all(
        files.map(file => uploadVerificationDocument(file))
      );
      
      toast.loading(t('verification.toast.submitting'), { id: uploadToastId });
      
      await submitVerification({
        gnDivisionId: data.gnDivisionId,
        documents: documentUrls,
      });

      toast.success(t('verification.toast.success'), { id: uploadToastId });
      setFiles([]);
      reset();
    } catch (error: any) {
      toast.error(t('verification.toast.error') + `: ${error.message}`, { id: uploadToastId });
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoadingProfile) {
    return <div>Loading profile...</div>; // Or a proper skeleton loader
  }

  const verificationStatus = (profile as any)?.gn_verified_status;
  if (verificationStatus && verificationStatus !== 'rejected') {
    return (
        <div className="max-w-2xl mx-auto p-4 sm:p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('verification.title')}</h2>
            <StatusDisplay status={verificationStatus} />
        </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('verification.title')}</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">{t('verification.subtitle')}</p>

      {verificationStatus === 'rejected' && (
        <div className="my-4 p-3 bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-700 dark:text-red-200">
            <p className="font-bold">{t('verification.status.rejectedNotice')}</p>
            <p className="text-sm">{t('verification.status.rejectedInstructions')}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-6">
          {/* GN Division ID Input */}
          <div>
            <label htmlFor="gnDivisionId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('verification.gnDivisionIdLabel')}
            </label>
            <input
              id="gnDivisionId"
              type="text"
              {...register('gnDivisionId', { required: t('verification.error.gnDivisionIdRequired') })}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder={t('verification.gnDivisionIdPlaceholder')}
            />
            {errors.gnDivisionId && <p className="mt-1 text-sm text-red-600">{errors.gnDivisionId.message}</p>}
          </div>

          {/* File Upload Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('verification.documentsLabel')}
            </label>
            <div
              onDrop={onDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${
                isDragOver ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <div className="space-y-1 text-center">
                <FaFileUpload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600 dark:text-gray-400">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                  >
                    <span>{t('verification.uploadFile')}</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={(e) => onFileChange(e.target.files)} />
                  </label>
                  <p className="pl-1">{t('verification.dragAndDrop')}</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500">{t('verification.fileTypes')}</p>
              </div>
            </div>
          </div>
          
          {/* File Previews */}
          <AnimatePresence>
            {files.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4"
              >
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('verification.selectedFiles')}</h4>
                <div className="mt-2 space-y-1">
                  {files.map((file, index) => (
                    <FilePreview key={`${file.name}-${index}`} file={file} onRemove={() => handleRemoveFile(index)} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Submit Button */}
        <div className="mt-8">
          <button
            type="submit"
            disabled={isUploading || isSubmitting || !isDirty || !isValid}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {(isUploading || isSubmitting) && <FaSpinner className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />}
            {isUploading ? t('verification.button.uploading') : isSubmitting ? t('verification.button.submitting') : t('verification.button.submit')}
          </button>
        </div>
      </form>
    </div>
  );
};
