import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

// Import slice reducers (placeholders for now, will be created in subsequent steps)
import authReducer from './slices/authSlice';
import settingsReducer from './slices/settingsSlice';
import marketplaceReducer from './slices/marketplaceSlice';
import rideReducer from './slices/rideSlice';
import notificationReducer from './slices/notificationSlice';
import offlineQueueReducer from './slices/offlineQueueSlice';

// Import the base API slice for RTK Query
import { api } from '../services/api';

/**
 * Configures the main Redux store for the YALURIDE application.
 *
 * It combines all the feature-based reducers and integrates the RTK Query middleware
 * for handling asynchronous data fetching and caching.
 */
export const store = configureStore({
  reducer: {
    // --- Feature Slices ---
    auth: authReducer,
    settings: settingsReducer,
    marketplace: marketplaceReducer,
    ride: rideReducer,
    notification: notificationReducer,
    offlineQueue: offlineQueueReducer,

    // --- API Slice ---
    // This is where the RTK Query reducers will be automatically added
    [api.reducerPath]: api.reducer,
  },
  // Adding the api middleware enables caching, invalidation, polling,
  // and other useful features of RTK Query.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
});

/**
 * Type representing the entire state of the Redux store.
 * Inferred from the store itself to ensure it's always up-to-date.
 */
export type RootState = ReturnType<typeof store.getState>;

/**
 * Type for the dispatch function from the store.
 * This is used to ensure that dispatched actions are correctly typed.
 */
export type AppDispatch = typeof store.dispatch;

// --- Typed Hooks ---
// It's recommended to use these typed hooks throughout the app instead of the plain `useDispatch` and `useSelector`.

/**
 * A pre-typed version of the `useDispatch` hook.
 * @returns The typed dispatch function.
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();

/**
 * A pre-typed version of the `useSelector` hook.
 * This hook is aware of the `RootState` type.
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
