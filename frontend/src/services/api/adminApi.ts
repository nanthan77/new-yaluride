import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../../../store'; // Adjust path based on your store setup

// --- Type Definitions for Admin API ---

/**
 * Statistics for the main dashboard cards.
 */
export interface PlatformStats {
  totalUsers: number;
  activeRides: number;
  totalRevenue: number;
  pendingVerifications: number;
  // Add other stats as needed
}

/**
 * Detailed view of a user for the admin panel.
 */
export interface AdminUserView {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  joinedAt: string;
  avatarUrl?: string;
}

export interface DriverVerification {
  id: string;
  user: User;
  verification_status: VerificationStatus;
  documents: Record<string, string>; // e.g., { license: 'url', vehicle_reg: 'url' }
  created_at: string;
}

export interface PlatformStats {
  totalUsers: number;
  activeRides: number;
  totalRevenue: number;
  pendingVerifications: number;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface FindUsersParams {
  page?: number;
  limit?: number;
  searchTerm?: string;
  role?: UserRole | '';
  status?: UserStatus | '';
}

interface UpdateUserStatusPayload {
  userId: string;
  status: UserStatus;
}

interface UpdateUserRolePayload {
  userId: string;
  role: UserRole;
}

interface SetVerificationStatusPayload {
  driverId: string;
  status: VerificationStatus;
  remarks?: string;
}

// --- API Slice Definition ---

export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/admin/', // Base path for all admin endpoints
    prepareHeaders: (headers, { getState }) => {
      // Get the token from the Redux store
      const token = (getState() as RootState).auth.session?.accessToken;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['AdminStats', 'User', 'UserList', 'VerificationQueue'],
  endpoints: (builder) => ({
    /**
     * 1. getPlatformStats Endpoint
     */
    getPlatformStats: builder.query<PlatformStats, void>({
      query: () => 'stats',
      providesTags: ['AdminStats'],
    }),

    /**
     * 2. findUsers Endpoint
     */
    findUsers: builder.query<PaginatedResponse<User>, FindUsersParams>({
      query: (params) => ({
        url: 'users',
        params: { ...params, role: params.role || undefined, status: params.status || undefined },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'User' as const, id })),
              { type: 'UserList', id: 'LIST' },
            ]
          : [{ type: 'UserList', id: 'LIST' }],
    }),

    /**
     * 3. updateUserStatus Endpoint
     */
    updateUserStatus: builder.mutation<User, UpdateUserStatusPayload>({
      query: ({ userId, status }) => ({
        url: `users/${userId}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: [{ type: 'UserList', id: 'LIST' }],
    }),

    /**
     * 4. updateUserRole Endpoint
     */
    updateUserRole: builder.mutation<User, UpdateUserRolePayload>({
      query: ({ userId, role }) => ({
        url: `users/${userId}/role`,
        method: 'PATCH',
        body: { role },
      }),
      invalidatesTags: [{ type: 'UserList', id: 'LIST' }],
    }),

    /**
     * 5. getVerificationQueue Endpoint
     */
    getVerificationQueue: builder.query<PaginatedResponse<DriverVerification>, { page?: number; limit?: number }>({
      query: (params) => ({
        url: 'drivers/verification-queue',
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'VerificationQueue' as const, id })),
              { type: 'VerificationQueue', id: 'LIST' },
            ]
          : [{ type: 'VerificationQueue', id: 'LIST' }],
    }),

    /**
     * 6. setVerificationStatus Endpoint
     */
    setVerificationStatus: builder.mutation<DriverVerification, SetVerificationStatusPayload>({
      query: ({ driverId, status, remarks }) => ({
        url: `drivers/${driverId}/verify`,
        method: 'POST',
        body: { status, remarks },
      }),
      // 7. Tag Invalidation
      invalidatesTags: (result, error, { driverId }) => [
        { type: 'VerificationQueue', id: 'LIST' },
        { type: 'VerificationQueue', id: driverId },
      ],
    }),
  }),
});

// Export hooks for use in components
export const {
  useGetPlatformStatsQuery,
  useFindUsersQuery,
  useUpdateUserStatusMutation,
  useUpdateUserRoleMutation,
  useGetVerificationQueueQuery,
  useSetVerificationStatusMutation,
} = adminApi;
useGetVerificationQueueQuery,
  useSetVerificationStatusMutation,
} = adminApi;
