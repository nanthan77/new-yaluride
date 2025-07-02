import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, Loader2, AlertCircle, Inbox } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  useGetNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
} from '../../../services/api/notificationApi';
import { selectAllNotifications, addNotification } from '../../../store/slices/notificationSlice';
import { NotificationWithJourney as Notification, NotificationType } from '../../../types/yaluride';
import { formatDateTime } from '../../../utils/shared';
import { supabase } from '../../../services/supabaseClient';
import { selectCurrentUser } from '../../auth/store/slices/authSlice';
import NotificationItem from '../components/NotificationItem'; // Assuming a separate component for item rendering

const NotificationsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);

  // --- Data Fetching ---
  const {
    data: notificationData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetNotificationsQuery(
    { page: 1, pageSize: 50 }, // Fetch a larger list for the dedicated page
    { skip: !currentUser } // Skip fetching if user is not logged in
  );

  const notifications = useAppSelector(selectAllNotifications);
  const unreadCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);

  // --- Mutations ---
  const [markAllAsRead, { isLoading: isMarkingAll }] = useMarkAllAsReadMutation();

  // --- Real-time Subscription ---
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel(`public:notifications:user_id=eq.${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          console.log('Real-time notification received:', payload);
          // We need to fetch the full notification with journey details
          // This could be optimized by having the payload include the joined data
          // or by having a separate API endpoint to fetch a single notification by ID.
          // For now, we refetch the list to get the new data.
          refetch();
          toast.info(t('notifications.newNotificationReceived'));
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to notifications channel.');
        }
        if (err) {
          console.error('Error subscribing to notifications channel:', err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, refetch, t]);

  // --- Handlers ---
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    toast.loading(t('notifications.markingAllAsRead'));
    try {
      await markAllAsRead().unwrap();
      toast.dismiss();
      toast.success(t('notifications.allMarkedAsRead'));
    } catch (err) {
      toast.dismiss();
      toast.error(t('notifications.errorMarkingAll'));
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  // --- Render Logic ---
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('notifications.loading')}</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <p className="mt-4 font-semibold text-red-700 dark:text-red-200">{t('errors.fetchFailedTitle', 'Failed to Load Notifications')}</p>
          <p className="mt-1 text-sm text-red-600 dark:text-red-300">{(error as any).data?.message || 'An unknown error occurred.'}</p>
          <button onClick={() => refetch()} className="mt-4 btn-secondary-outline border-red-500 text-red-600 hover:bg-red-100">
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.retry')}
          </button>
        </div>
      );
    }

    if (notifications.length === 0) {
      return (
        <div className="text-center py-16 px-4">
          <Inbox size={48} className="mx-auto text-gray-400 dark:text-gray-500" />
          <p className="mt-4 font-medium text-lg text-gray-700 dark:text-gray-300">{t('notifications.allCaughtUp')}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('notifications.noNewNotifications')}</p>
        </div>
      );
    }

    return (
      <motion.ul
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.05 } },
          hidden: {},
        }}
        className="space-y-3"
      >
        {notifications.map((notification) => (
          <NotificationItem key={notification.id} notification={notification} />
        ))}
      </motion.ul>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-6"
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          <Bell className="mr-3 h-8 w-8 text-blue-600 dark:text-blue-400" />
          {t('notifications.title')}
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAll}
            className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
          >
            {isMarkingAll ? (
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
            ) : (
              <CheckCheck className="mr-1.5 h-4 w-4" />
            )}
            {t('notifications.markAllAsRead')}
          </button>
        )}
      </motion.div>

      {renderContent()}
    </div>
  );
};

export default NotificationsPage;
