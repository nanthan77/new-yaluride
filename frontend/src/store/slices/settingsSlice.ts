import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../index';

// --- TypeScript Types ---

export type Theme = 'light' | 'dark' | 'system';
export type Language = 'en' | 'si' | 'ta';

export interface NotificationSettings {
  pushPromotions: boolean;
  emailRideReceipts: boolean;
  smsRideUpdates: boolean;
  rideStatusChanges: boolean; // e.g., Driver arrived, ride completed
  newBids: boolean;
}

type SettingsStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface SettingsState {
  theme: Theme;
  language: Language;
  notificationPreferences: NotificationSettings;
  status: SettingsStatus;
  error: string | null;
}

// --- Initial State ---

const initialState: SettingsState = {
  theme: 'system', // Default to user's system preference
  language: 'en', // Default language
  notificationPreferences: {
    pushPromotions: true,
    emailRideReceipts: true,
    smsRideUpdates: false,
    rideStatusChanges: true,
    newBids: true,
  },
  status: 'idle',
  error: null,
};

// --- Async Thunks (Placeholders) ---

/**
 * Fetches user settings from the backend.
 * In a real app, this would make an API call.
 */
export const fetchUserSettings = createAsyncThunk(
  'settings/fetchUserSettings',
  async (userId: string, { rejectWithValue }) => {
    try {
      // Simulate API call
      console.log(`Fetching settings for user: ${userId}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      // In a real app, you would fetch from your backend:
      // const response = await api.get(`/users/${userId}/settings`);
      // return response.data;

      // Return mock data for now
      const mockSettings: Partial<SettingsState> = {
        theme: 'dark',
        language: 'si',
        notificationPreferences: {
          pushPromotions: false,
          emailRideReceipts: true,
          smsRideUpdates: true,
          rideStatusChanges: true,
          newBids: true,
        },
      };
      return mockSettings;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch settings');
    }
  }
);

/**
 * Saves user settings to the backend.
 */
export const saveUserSettings = createAsyncThunk(
  'settings/saveUserSettings',
  async (settings: Partial<SettingsState>, { getState, rejectWithValue }) => {
    const { auth } = getState() as RootState;
    if (!auth.user) {
      return rejectWithValue('User not authenticated');
    }
    try {
      // Simulate API call
      console.log(`Saving settings for user: ${auth.user.id}`, settings);
      await new Promise(resolve => setTimeout(resolve, 1500));
      // In a real app, you would save to your backend:
      // const response = await api.put(`/users/${auth.user.id}/settings`, settings);
      // return response.data;

      // Return the saved settings on success
      return settings;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to save settings');
    }
  }
);

// --- Settings Slice ---

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    /**
     * Sets the application theme.
     */
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
      // You could also persist this to localStorage here for immediate effect
      localStorage.setItem('yaluride-theme', action.payload);
    },
    /**
     * Sets the application language.
     */
    setLanguage: (state, action: PayloadAction<Language>) => {
      state.language = action.payload;
    },
    /**
     * Updates a single notification preference.
     */
    updateNotificationPreference: (
      state,
      action: PayloadAction<{ key: keyof NotificationSettings; value: boolean }>
    ) => {
      const { key, value } = action.payload;
      state.notificationPreferences[key] = value;
    },
  },
  extraReducers: (builder) => {
    builder
      // --- Fetch User Settings ---
      .addCase(fetchUserSettings.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchUserSettings.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Merge fetched settings into the state
        if (action.payload.theme) state.theme = action.payload.theme;
        if (action.payload.language) state.language = action.payload.language;
        if (action.payload.notificationPreferences) {
          state.notificationPreferences = {
            ...state.notificationPreferences,
            ...action.payload.notificationPreferences,
          };
        }
      })
      .addCase(fetchUserSettings.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      // --- Save User Settings ---
      .addCase(saveUserSettings.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(saveUserSettings.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // The reducers have already updated the state optimistically.
        // This confirms the save was successful. We could merge the response
        // if the backend returns the final saved state.
        console.log('Settings saved successfully:', action.payload);
      })
      .addCase(saveUserSettings.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
        // Here you might want to revert the state to its previous version
        // This requires storing the previous state before the optimistic update
        console.error('Failed to save settings, UI might be out of sync with backend.');
      });
  },
});

// --- Export Actions ---
export const {
  setTheme,
  setLanguage,
  updateNotificationPreference,
} = settingsSlice.actions;

// --- Export Selectors ---
export const selectTheme = (state: RootState): Theme => state.settings.theme;
export const selectLanguage = (state: RootState): Language => state.settings.language;
export const selectNotificationPreferences = (state: RootState): NotificationSettings => state.settings.notificationPreferences;
export const selectSettingsStatus = (state: RootState): SettingsStatus => state.settings.status;
export const selectSettingsError = (state: RootState): string | null => state.settings.error;

// --- Export Reducer ---
export default settingsSlice.reducer;
