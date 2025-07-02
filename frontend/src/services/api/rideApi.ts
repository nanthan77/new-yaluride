import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../../../store'; // Assuming a RootState type is exported from your store setup

// --- Type Definitions ---

/**
 * The argument shape for the submitMoodRating mutation.
 */
interface SubmitMoodRatingArg {
  rideId: string;
  ratingValue: number;
}

/**
 * The argument shape for the processTip mutation.
 */
interface ProcessTipArg {
  rideId: string;
  tipAmount: number;
}

/**
 * The expected successful response shape from the backend for processTip.
 */
interface ProcessTipResponse {
  success: boolean;
  message: string;
  transactionId: string;
  rideId: string;
  tipAmount: number;
}

/**
 * The expected successful response shape from the backend.
 */
interface SubmitMoodRatingResponse {
  success: boolean;
  message: string;
  rideId: string;
  rating: number;
}

/**
 * A placeholder for the detailed Ride object shape.
 */
interface RideDetails {
    id: string;
    status: string;
    // ... other ride properties
    moodRating?: number;
}


// --- API Slice Definition ---

export const rideApi = createApi({
  /**
   * The reducerPath is a unique key that your service will be mounted to in your Redux store.
   */
  reducerPath: 'rideApi',

  /**
   * Configure the base query function. Here we use fetchBaseQuery which is a
   * lightweight wrapper around fetch for common use-cases.
   */
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/', // All endpoints will be relative to this base URL.
    prepareHeaders: (headers, { getState }) => {
      // Attach the user's auth token to every request if it exists.
      const token = (getState() as RootState).auth.token; // Adjust path based on your Redux store structure
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),

  /**
   * Tag types are used for caching and invalidation. They help RTK Query know
   * which data needs to be refetched after a mutation.
   */
  tagTypes: ['RideDetails'],

  /**
   * Endpoints are where you define your queries and mutations.
   */
  endpoints: (builder) => ({
    /**
     * Mutation to submit a mood rating for a specific ride.
     */
    submitMoodRating: builder.mutation<SubmitMoodRatingResponse, SubmitMoodRatingArg>({
      query: ({ rideId, ratingValue }) => ({
        url: `rides/${rideId}/mood-rating`,
        method: 'POST',
        body: { rating: ratingValue }, // The backend API expects the rating in this format.
      }),
      /**
       * After a successful mood rating submission, we want to invalidate the cache
       * for this specific ride's details. This ensures that any part of the UI
       * displaying this ride's data will be automatically updated with the latest
       * information (including the new rating) on the next fetch.
       */
      invalidatesTags: (result, error, { rideId }) => [{ type: 'RideDetails', id: rideId }],
    }),

    /**
     * Example query to fetch details for a single ride.
     * This demonstrates how a mutation can invalidate a query's cache.
     */
    getRideDetails: builder.query<RideDetails, string>({
        query: (rideId) => `rides/${rideId}`,
        /**
         * This query "provides" a tag associated with a specific ride ID.
         * When the `submitMoodRating` mutation "invalidates" this tag, this query
         * will be automatically refetched if it's currently active.
         */
        providesTags: (result, error, rideId) => [{ type: 'RideDetails', id: rideId }],
    }),

    /**
     * Mutation to process a tip payment for a completed ride.
     */
    processTip: builder.mutation<ProcessTipResponse, ProcessTipArg>({
      query: ({ rideId, tipAmount }) => ({
        url: `payments/process-tip`,
        method: 'POST',
        body: { rideId, tipAmount },
      }),
      invalidatesTags: (result, error, { rideId }) =>
        result && result.success ? [{ type: 'RideDetails', id: rideId }] : [],
    }),

    // --- Other ride-related endpoints would be added here ---
    // e.g., cancelRide, getRideHistory, etc.
  }),
});

/**
 * Export the auto-generated hooks for use in your React components.
 * These hooks encapsulate the entire data fetching and caching logic.
 */
export const {
  useSubmitMoodRatingMutation,
  useGetRideDetailsQuery, // Also exporting the example query hook
  useProcessTipMutation,
} = rideApi;
