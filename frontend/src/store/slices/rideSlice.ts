import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../store'; // Adjust path

/**
 * The base API slice using RTK Query.
 * All other API slices will inject their endpoints into this one.
 * This setup allows for a single, centralized API configuration with shared
 * caching, invalidation, and middleware logic.
 */
export const api = createApi({
  /**
   * The reducerPath is the key where the API slice's state will be stored in the Redux store.
   */
  reducerPath: 'api',

  /**
   * The base query to be used by all endpoints. It automatically adds the
   * Authorization header with the JWT from the Redux state.
   */
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL || '/api/', // Your backend API base URL
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.session?.access_token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),

  /**
   * Tag types are used for caching and invalidation.
   * Define a tag for each type of data you'll be fetching.
   */
  tagTypes: [
    'User',
    'Profile',
    'Journey',
    'Bid',
    'Ride',
    'RideHistory',
    'Notification',
    'Setting',
  ],

  /**
   * Endpoints are defined in separate API slice files and injected here.
   * This keeps the API definition modular and organized by feature.
   */
  endpoints: () => ({}),
});
