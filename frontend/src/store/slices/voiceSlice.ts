import { createSlice, PayloadAction, createAsyncThunk, Middleware } from '@reduxjs/toolkit';
import { RootState } from '../index'; // Assuming your root store setup is in ../index.ts

// --- Type Definitions ---

export type VoiceStatus = 'idle' | 'listening' | 'processing' | 'error' | 'success' | 'confirming';
export type CommandStatus = 'sent' | 'cached' | 'processed_ok' | 'processed_error' | 'processing_cached';

export interface LanguageOption {
  code: 'si-LK' | 'ta-LK' | 'en-US' | 'auto';
  name: string;
}

export interface CommandHistoryItem {
  id: string; // A unique ID for the command instance (e.g., crypto.randomUUID())
  timestamp: number;
  commandText?: string;
  language: LanguageOption['code'];
  status: CommandStatus;
  apiResponse?: any;
  error?: string;
}

export interface VoiceState {
  status: VoiceStatus;
  activeLanguage: LanguageOption['code'];
  commandHistory: CommandHistoryItem[];
  error: string | null;
  isMicPermissionGranted: boolean | null; // null = not yet determined
}

// --- Initial State ---

const initialState: VoiceState = {
  status: 'idle',
  activeLanguage: 'auto', // Default to auto-detect
  commandHistory: [],
  error: null,
  isMicPermissionGranted: null,
};

// --- Redux Slice ---

const voiceSlice = createSlice({
  name: 'voice',
  initialState,
  reducers: {
    /**
     * Sets the overall status of the voice UI.
     */
    setVoiceStatus(state, action: PayloadAction<VoiceStatus>) {
      state.status = action.payload;
      // Clear error when status changes from 'error' to something else
      if (state.error && action.payload !== 'error') {
        state.error = null;
      }
    },

    /**
     * Sets the microphone permission status.
     */
    setMicPermissionStatus(state, action: PayloadAction<boolean>) {
      state.isMicPermissionGranted = action.payload;
    },

    /**
     * Adds a new command to the beginning of the history log.
     * Limits the history to a reasonable number (e.g., 20 items).
     */
    addCommandToHistory(state, action: PayloadAction<CommandHistoryItem>) {
      state.commandHistory.unshift(action.payload);
      if (state.commandHistory.length > 20) {
        state.commandHistory.pop();
      }
    },

    /**
     * Updates the status and details of an existing command in the history.
     */
    updateCommandStatus(
      state,
      action: PayloadAction<{
        id: string;
        status: CommandStatus;
        commandText?: string;
        apiResponse?: any;
        error?: string;
      }>,
    ) {
      const { id, ...updates } = action.payload;
      const commandIndex = state.commandHistory.findIndex((cmd) => cmd.id === id);
      if (commandIndex !== -1) {
        state.commandHistory[commandIndex] = {
          ...state.commandHistory[commandIndex],
          ...updates,
        };
      }
    },

    /**
     * Sets an error message and updates the status to 'error'.
     */
    setVoiceError(state, action: PayloadAction<string>) {
      state.status = 'error';
      state.error = action.payload;
    },

    /**
     * Clears the current error message and resets the status to 'idle'.
     */
    clearVoiceError(state) {
      state.error = null;
      if (state.status === 'error') {
        state.status = 'idle';
      }
    },

    /**
     * Sets the active language for voice recognition.
     */
    setActiveLanguage(state, action: PayloadAction<LanguageOption['code']>) {
      state.activeLanguage = action.payload;
    },

    /**
     * Clears the entire command history.
     */
    clearCommandHistory(state) {
      state.commandHistory = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(processVoiceCommand.pending, (state) => {
        state.status = 'processing';
        state.error = null;
      })
      .addCase(processVoiceCommand.fulfilled, (state, action) => {
        // The middleware will handle the success logic. Here we just reset status.
        state.status = 'success';
        // You could update the history item here based on action.meta.requestId
      })
      .addCase(processVoiceCommand.rejected, (state, action) => {
        state.status = 'error';
        state.error = (action.payload as string) || 'Voice command failed';
      });
  },
});

// ---------------------------------------------------------------------------
// Async Thunk: processVoiceCommand
// ---------------------------------------------------------------------------

interface ProcessVoiceCommandArgs {
  audioBlob: Blob;
  languageCode: LanguageOption['code'];
}

interface VoiceCommandResponse {
  intent: 'BOOK_RIDE' | 'CANCEL_RIDE' | 'GET_ETA' | 'UNKNOWN';
  entities: {
    destination?: string;
    origin?: string;
    // ... other entities
  };
  transcription: string;
}

/**
 * Sends an audio blob to the backend voice service, receives the NLP result,
 * and makes the result available for the middleware to process.
 */
export const processVoiceCommand = createAsyncThunk<
  VoiceCommandResponse,
  ProcessVoiceCommandArgs,
  {
    rejectValue: string;
  }
>('voice/processVoiceCommand', async ({ audioBlob, languageCode }, { dispatch, rejectWithValue }) => {
  try {
    dispatch(setVoiceStatus('processing'));

    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice-command.webm');
    formData.append('languageCode', languageCode);

    // This fetch call would be to your backend's voice service endpoint
    const response = await fetch('/api/voice/process', {
      method: 'POST',
      body: formData,
      // Include auth headers if needed
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `Voice service error: ${response.status}` }));
      throw new Error(errorData.message);
    }

    const result: VoiceCommandResponse = await response.json();
    return result;
  } catch (err: any) {
    const errorMessage = err.message || 'An unknown error occurred during voice processing.';
    dispatch(setVoiceError(errorMessage));
    return rejectWithValue(errorMessage);
  }
});

// --- Export Actions ---
export const {
  setVoiceStatus,
  setMicPermissionStatus,
  addCommandToHistory,
  updateCommandStatus,
  setVoiceError,
  clearVoiceError,
  setActiveLanguage,
  clearCommandHistory,
} = voiceSlice.actions;

// --- Export Selectors ---
export const selectVoiceState = (state: RootState) => state.voice;
export const selectVoiceStatus = (state: RootState) => state.voice.status;
export const selectActiveLanguage = (state: RootState) => state.voice.activeLanguage;
export const selectCommandHistory = (state: RootState) => state.voice.commandHistory;
export const selectVoiceError = (state: RootState) => state.voice.error;
export const selectIsMicPermissionGranted = (state: RootState) => state.voice.isMicPermissionGranted;

// --- Export Reducer ---
export default voiceSlice.reducer;


// ---------------------------------------------------------------------------
// Voice Command Middleware
// ---------------------------------------------------------------------------

// --- Placeholder Actions (These would be imported from other slices) ---
const rideSlice = {
  actions: {
    startRideBooking: (payload: any) => ({ type: 'ride/startBooking', payload }),
    cancelCurrentRide: () => ({ type: 'ride/cancelCurrent' }),
  },
};
const mapSlice = {
  actions: {
    fetchEta: (payload: any) => ({ type: 'map/fetchEta', payload }),
  },
};
// ---------------------------------------------------------------------------


/**
 * Redux Middleware to interpret successful voice commands and dispatch corresponding actions.
 */
export const voiceMiddleware: Middleware = (store) => (next) => (action) => {
  // Check if the action is the successful completion of our async thunk
  if (processVoiceCommand.fulfilled.match(action)) {
    const { intent, entities, transcription } = action.payload as VoiceCommandResponse;
    const { dispatch } = store;

    console.log(`[Voice Middleware] Intercepted intent: ${intent}`, entities);

    // Use a switch statement to handle different voice intents
    switch (intent) {
      case 'BOOK_RIDE':
        if (entities.destination) {
          dispatch(
            rideSlice.actions.startRideBooking({
              destination: entities.destination,
              origin: entities.origin, // Can be null
            }),
          );
          // Optionally provide feedback to the user
          dispatch(setVoiceStatus('success')); // Or a specific status like 'action_dispatched'
        } else {
          dispatch(setVoiceError('Could not understand the destination. Please try again.'));
        }
        break;

      case 'CANCEL_RIDE':
        dispatch(rideSlice.actions.cancelCurrentRide());
        dispatch(setVoiceStatus('success'));
        break;

      case 'GET_ETA':
        // Assuming we need the current ride context from the ride slice
        const currentRideId = store.getState().ride.currentRideId;
        if (currentRideId) {
          dispatch(mapSlice.actions.fetchEta({ rideId: currentRideId }));
        } else {
          dispatch(setVoiceError('There is no active ride to get an ETA for.'));
        }
        break;

      case 'UNKNOWN':
      default:
        // Handle unrecognized commands
        dispatch(setVoiceError(`Sorry, I didn't understand the command: "${transcription}"`));
        break;
    }
  }

  // Pass the action along to the next middleware or the reducer
  return next(action);
};

/*
 * =======================================================================================
 * HOW TO INTEGRATE THE MIDDLEWARE
 * =======================================================================================
 *
 * In your Redux store configuration file (e.g., `src/store/index.ts`),
 * you need to add the `voiceMiddleware` to the middleware chain.
 *
 * Example:
 *
 * import { configureStore } from '@reduxjs/toolkit';
 * import rootReducer from './rootReducer'; // Your combined reducers
 * import { voiceMiddleware } from './slices/voiceSlice';
 *
 * export const store = configureStore({
 *   reducer: rootReducer,
 *   middleware: (getDefaultMiddleware) =>
 *     getDefaultMiddleware().concat(voiceMiddleware), // Add it here
 * });
 *
 * =======================================================================================
 */