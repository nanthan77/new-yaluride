import { api } from '../api';
import { supabase } from '../supabaseClient';
import { NotificationWithJourney as Notification } from '../../types/yaluride';

// Define the response type for the getNotifications query, including pagination info
interface GetNotificationsResponse {
  notifications: Notification[];
  count: number | null;
}

// Define the arguments for the getNotifications query
interface GetNotificationsArgs {
  page?: number;
  pageSize?: number;
}

// Define the API slice for notifications
export const notificationApi = api.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Fetches a paginated list of notifications for the current user.
     */
    getNotifications: builder.query<GetNotificationsResponse, GetNotificationsArgs>({
      queryFn: async ({ page = 1, pageSize = 15 }) => {
        try {
          const from = (page - 1) * pageSize;
          const to = from + pageSize - 1;

          const { data, error, count } = await supabase
            .from('notifications')
            .select(`
              *,
              journey:journeys!related_journey_id (
                id,
                pickup_location_text,
                dropoff_location_text,
                status
              )
            `)
            .order('created_at', { ascending: false })
            .range(from, to);

          if (error) throw error;
          
          return { data: { notifications: data as Notification[], count } };
        } catch (error: any) {
          console.error('Error fetching notifications:', error);
          return { error: { status: 'CUSTOM_ERROR', error: error.message || 'Failed to fetch notifications' } };
        }
      },
      providesTags: (result) =>
        result && result.notifications
          ? [
              ...result.notifications.map(({ id }) => ({ type: 'Notification' as const, id })),
              { type: 'Notification', id: 'LIST' },
            ]
          : [{ type: 'Notification', id: 'LIST' }],
    }),

    /**
     * Fetches the count of unread notifications for the current user.
     */
    getUnreadNotificationCount: builder.query<{ count: number }, void>({
      queryFn: async () => {
        try {
          const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('is_read', false);

          if (error) throw error;
          
          return { data: { count: count ?? 0 } };
        } catch (error: any) {
          console.error('Error fetching unread notification count:', error);
          return { error: { status: 'CUSTOM_ERROR', error: error.message || 'Failed to fetch unread count' } };
        }
      },
      providesTags: ['Notification'],
    }),

    /**
     * Marks a single notification as read.
     */
    markAsRead: builder.mutation<Notification, string>({
      queryFn: async (notificationId) => {
        try {
          const { data, error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', notificationId)
            .select()
            .single();
            
          if (error) throw error;
          
          return { data: data as Notification };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message || 'Failed to mark notification as read' } };
        }
      },
      // Invalidate the specific notification, the list, and the unread count
      invalidatesTags: (result, error, id) => [
        { type: 'Notification', id },
        { type: 'Notification', id: 'LIST' },
        { type: 'Notification', id: 'UNREAD_COUNT' },
      ],
    }),

    /**
     * Marks all of the user's unread notifications as read.
     * This calls a PostgreSQL function for efficiency.
     */
    markAllAsRead: builder.mutation<{ success: boolean }, void>({
      queryFn: async () => {
        try {
          // It's best practice to create a PostgreSQL function to handle this operation atomically on the server.
          // `mark_all_notifications_as_read` would be a function that takes no args and updates rows based on `auth.uid()`.
          const { error } = await supabase.rpc('mark_all_notifications_as_read');
          
          if (error) throw error;
          
          return { data: { success: true } };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message || 'Failed to mark all notifications as read' } };
        }
      },
      // Invalidate the entire list and the unread count
      invalidatesTags: [{ type: 'Notification', id: 'LIST' }, { type: 'Notification', id: 'UNREAD_COUNT' }],
    }),
  }),
});

// Export hooks for use in UI components
export const {
  useGetNotificationsQuery,
  useGetUnreadNotificationCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
} = notificationApi;
