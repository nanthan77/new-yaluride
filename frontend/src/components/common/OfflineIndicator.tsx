import React, { useState, useEffect, useCallback, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, List, RefreshCw, AlertCircle, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';

// --- Placeholder Imports & Hooks ---
// In a real app, these would come from your state management (e.g., Redux) and API services.

// Mock hook to simulate getting the offline queue from a Redux store
const useOfflineQueue = () => {
  // Mock data to demonstrate all states
  const mockQueue = [
    { clientId: '1', type: 'BOOK_RIDE', status: 'pending', payload: { destination: 'Kandy' }, retries: 0 },
    { clientId: '2', type: 'SEND_MESSAGE', status: 'retrying', payload: { content: 'I am on my way.' }, retries: 2, errorInfo: { message: 'Network timeout' } },
    { clientId: '3', type: 'UPDATE_PROFILE', status: 'failed_permanent', payload: { name: 'New Name' }, errorInfo: { message: 'Validation failed on server' } },
    { clientId: '4', type: 'RATE_DRIVER', status: 'conflict', payload: { rating: 5 }, errorInfo: { message: 'This ride has already been rated on another device.' } },
  ];
  return { queue: mockQueue, totalPending: mockQueue.filter(a => ['pending', 'retrying'].includes(a.status)).length };
};

// Mock function to simulate retrying an action
const retryAction = (clientId: string) => {
  toast.success(`Retrying action ${clientId}...`);
  console.log(`[OfflineIndicator] Manually retrying action: ${clientId}`);
};

// Mock function to simulate resolving a conflict
const resolveConflict = (clientId: string) => {
  toast.info(`Navigating to resolve conflict for action ${clientId}...`);
  console.log(`[OfflineIndicator] User needs to resolve conflict for action: ${clientId}`);
};

// Custom hook to detect online/offline status
const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};
// --- End Placeholder Imports & Hooks ---

// --- Sub-components ---

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'pending':
    case 'retrying':
      return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
    case 'failed_permanent':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'conflict':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    case 'synced':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    default:
      return null;
  }
};

const ActionItem: React.FC<{ action: any }> = ({ action }) => {
  const { t } = useTranslation();
  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-start justify-between space-x-3">
      <div className="flex-shrink-0 pt-1">
        <StatusIcon status={action.status} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t(`offlineQueue.actionType.${action.type}`, action.type)}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t(`offlineQueue.status.${action.status}`, action.status)}
          {action.status === 'retrying' && ` (${t('offlineQueue.retries', { count: action.retries })})`}
        </p>
        {action.errorInfo && <p className="text-xs text-red-500 mt-1 truncate" title={action.errorInfo.message}>{action.errorInfo.message}</p>}
      </div>
      <div className="flex-shrink-0">
        {action.status === 'failed_permanent' && (
          <button onClick={() => retryAction(action.clientId)} className="text-xs text-blue-600 hover:underline">{t('offlineQueue.retryNow')}</button>
        )}
        {action.status === 'conflict' && (
          <button onClick={() => resolveConflict(action.clientId)} className="text-xs text-orange-600 hover:underline">{t('offlineQueue.resolve')}</button>
        )}
      </div>
    </div>
  );
};

const OfflineQueueModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { queue } = useOfflineQueue();

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-gray-900 dark:text-white flex items-center justify-between">
                  {t('offlineQueue.title')}
                  <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                    <X size={20} />
                  </button>
                </Dialog.Title>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('offlineQueue.description')}
                  </p>
                </div>

                <div className="mt-4 max-h-80 overflow-y-auto space-y-2 pr-2">
                  {queue.length > 0 ? (
                    queue.map((action) => <ActionItem key={action.clientId} action={action} />)
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="mx-auto h-8 w-8 text-green-500" />
                      <p className="mt-2 text-sm">{t('offlineQueue.allSynced')}</p>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};


// --- Main Indicator Component ---

export const OfflineIndicator: React.FC = () => {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { totalPending } = useOfflineQueue();

  return (
    <>
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-sm font-semibold z-50 shadow-lg"
            role="status"
          >
            <div className="container mx-auto px-4 py-2 flex items-center justify-center text-center">
              <WifiOff className="h-5 w-5 mr-3 flex-shrink-0" />
              <span>{t('offline.bannerMessage')}</span>
              {totalPending > 0 && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="ml-4 flex items-center text-white underline hover:text-yellow-100"
                >
                  <List className="h-4 w-4 mr-1" />
                  {t('offline.viewQueue', { count: totalPending })}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <OfflineQueueModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
