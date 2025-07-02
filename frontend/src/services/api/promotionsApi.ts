import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../../../store';

// --- Type Definitions (align with backend DTOs) ---

// From promotions.dto.ts
export interface VoucherDto {
  id: string;
  code: string;
  description: string;
  discount_type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discount_value: number;
  max_discount_amount?: number;
  expires_at: string;
}

export interface UserVoucherDto {
  id: string;
  status: 'ACTIVE' | 'REDEEMED' | 'EXPIRED';
  voucher: VoucherDto;
}

export interface ApplyVoucherDto {
  code: string;
  rideAmount: number;
}

export interface ApplyVoucherResponseDto {
  success: boolean;
  originalFare: number;
  discountAmount: number;
  newFare: number;
  voucherCode: string;
}

// From gamification.dto.ts
export interface LeaderboardEntryDto {
  rank: number;
  user_id: string;
  display_name: string;
  points_balance: number;
}

export interface ReferralCodeDto {
  code: string;
  usage_count: number;
}

// --- API Slice Definition ---

export const promotionsApi = createApi({
  reducerPath: 'promotionsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/', // Base path for the API
    prepareHeaders: (headers, { getState }) => {
      // Get the token from the Redux store
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Voucher', 'ReferralCode', 'Leaderboard'],
  endpoints: (builder) => ({
    /**
     * 1. getAvailableVouchers Endpoint
     * Fetches all vouchers that are currently available to the logged-in user.
     */
    getAvailableVouchers: builder.query<UserVoucherDto[], void>({
      query: () => 'promotions/my-vouchers',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Voucher' as const, id })),
              { type: 'Voucher', id: 'LIST' },
            ]
          : [{ type: 'Voucher', id: 'LIST' }],
    }),

    /**
     * 2. applyVoucher Endpoint
     * A mutation to validate and apply a voucher to a ride, returning the discount details.
     */
    applyVoucher: builder.mutation<ApplyVoucherResponseDto, ApplyVoucherDto>({
      query: (body) => ({
        url: 'promotions/apply-voucher',
        method: 'POST',
        body,
      }),
      // Applying a voucher might affect the list of available vouchers if it has usage limits.
      invalidatesTags: [{ type: 'Voucher', id: 'LIST' }],
    }),

    /**
     * 3. getReferralCode Endpoint
     * Fetches the logged-in user's personal referral code.
     */
    getReferralCode: builder.query<ReferralCodeDto, void>({
      query: () => 'promotions/my-referral-code', // Assuming this endpoint exists
      providesTags: ['ReferralCode'],
    }),

    /**
     * 4. getLeaderboard Endpoint
     * Fetches the gamification leaderboard with pagination.
     */
    getLeaderboard: builder.query<LeaderboardEntryDto[], { page?: number; limit?: number }>({
      query: ({ page = 1, limit = 20 }) => `gamification/leaderboard?page=${page}&limit=${limit}`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ user_id }) => ({ type: 'Leaderboard' as const, id: user_id })),
              { type: 'Leaderboard', id: 'LIST' },
            ]
          : [{ type: 'Leaderboard', id: 'LIST' }],
    }),
  }),
});

// Export hooks for use in components
export const {
  useGetAvailableVouchersQuery,
  useApplyVoucherMutation,
  useGetReferralCodeQuery,
  useGetLeaderboardQuery,
} = promotionsApi;
