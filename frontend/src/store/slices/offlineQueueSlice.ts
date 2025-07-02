import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../index';
// Assuming a simplified type for UI display. The full type is in offlineQueueManager.
import { ActionType, ActionPriority, ActionStatus } from '../../utils/offlineQueueManager';

// --- TypeScript Types ---

/**
 * Represents the status of the entire synchronization queue.
 */
export type QueueStatus = 'idle' | 'processing' | 'synced' | 'error';

/**
 * A simplified representation of a queued action, suitable for storing in the Redux state.
 * Large payloads like file blobs should not be stored here.
 */
export interface QueuedActionForStore {
  id?: number; // DB id
  clientId: string; // Client-generated UUID
  type: ActionType;
  payload: any; // Keep payload small or store a reference/summary
  timestamp: number;
  priority: ActionPriority;
  status: ActionStatus;
  retries: number;
  errorInfo?: {
    message: string;
    statusCode?: number;
  };
  metadata?: Record<string, any>;
}

/**
 * Defines the shape of the offline queue state in the Redux store.
 */
export interface OfflineQueueState {
  actions: QueuedActionForStore[];
  status: QueueStatus;
  error: string | null;
}

// --- Initial State ---

const initialState: OfflineQueueState = {
  actions: [],
  status: 'idle',
  error: null,
};


// --- Offline Queue Slice ---

const offlineQueueSlice = createSlice({
  name: 'offlineQueue',
  initialState,
  reducers: {
    /**
     * Initializes or replaces the entire queue state in Redux.
     * Should be called on app startup after loading from IndexedDB.
     */
    loadQueueState: (state, action: PayloadAction<QueuedActionForStore[]>) => {
      state.actions = action.payload;
      state.status = action.payload.length > 0 ? 'processing' : 'idle'; // Assume processing if items exist
    },

    /**
     * Adds or updates an action in the queue. This is the primary way the UI learns about new tasks.
     * It can be used for adding a new pending action or updating the status of an existing one.
     */
    upsertActionInQueue: (state, action: PayloadAction<QueuedActionForStore>) => {
      const existingIndex = state.actions.findIndex(a => a.clientId === action.payload.clientId);
      if (existingIndex !== -1) {
        // Update existing action
        state.actions[existingIndex] = action.payload;
      } else {
        // Add new action to the top of the list for visibility
        state.actions.unshift(action.payload);
      }
      // If any action is pending or retrying, the queue is effectively processing
      if (state.actions.some(a => a.status === 'pending' || a.status === 'retrying')) {
          state.status = 'processing';
      }
    },

    /**
     * Removes a successfully synced or permanently failed action from the UI.
     */
    removeActionFromQueue: (state, action: PayloadAction<{ clientId: string }>) => {
      state.actions = state.actions.filter(a => a.clientId !== action.payload.clientId);
    },

    /**
     * Sets the overall status of the queue process.
     */
    setQueueStatus: (state, action: PayloadAction<QueueStatus>) => {
      state.status = action.payload;
      if (action.payload === 'synced' || action.payload === 'idle') {
        // Clear out successfully synced items when the queue is fully synced
        state.actions = state.actions.filter(a => a.status !== 'synced');
      }
    },

    /**
     * Sets a global error message for the queue.
     */
    setQueueError: (state, action: PayloadAction<string>) => {
      state.status = 'error';
      state.error = action.payload;
    },

    /**
     * Clears all actions from the queue UI and resets the state.
     */
    clearQueue: (state) => {
      state.actions = [];
      state.status = 'idle';
      state.error = null;
    },
  },
});

// --- Export Actions ---
export const {
  loadQueueState,
  upsertActionInQueue,
  removeActionFromQueue,
  setQueueStatus,
  setQueueError,
  clearQueue,
} = offlineQueueSlice.actions;

// --- Export Selectors ---

/**
 * Selects all actions currently tracked by the UI.
 */
export const selectQueuedActions = (state: RootState): QueuedActionForStore[] => state.offlineQueue.actions;

/**
 * Selects the overall status of the offline queue.
 */
export const selectQueueStatus = (state: RootState): QueueStatus => state.offlineQueue.status;

/**
 * Selects any global error message related to the queue processing.
 */
export const selectQueueError = (state: RootState): string | null => state.offlineQueue.error;

/**
 * Selects the count of actions that are not yet successfully synced.
 */
export const selectPendingActionCount = (state: RootState): number => {
  return state.offlineQueue.actions.filter(action => action.status !== ActionStatus.SYNCED).length;
};

/**
 * Selects whether the queue is actively trying to process items.
 */
export const selectIsQueueSyncing = (state: RootState): boolean => state.offlineQueue.status === 'processing';


// --- Export Reducer ---
export default offlineQueueSlice.reducer;
