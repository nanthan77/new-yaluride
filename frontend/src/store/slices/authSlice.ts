import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Session, User, AuthError, SignInWithPasswordCredentials, SignUpWithPasswordCredentials } from '@supabase/supabase-js';
import { supabase } from '../../services/supabaseClient'; // Adjust path to your Supabase client instance
import { RootState } from '../index';

// --- TypeScript Types ---

/**
 * Represents the status of an asynchronous authentication operation.
 */
type AuthStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

/**
 * Defines the shape of the authentication state in the Redux store.
 */
export interface AuthState {
  user: User | null;
  session: Session | null;
  status: AuthStatus;
  error: string | null;
  isInitialized: boolean; // To track if the initial session check is complete
}

// --- Initial State ---

const initialState: AuthState = {
  user: null,
  session: null,
  status: 'idle',
  error: null,
  isInitialized: false,
};

// --- Async Thunks ---

/**
 * Fetches the current user and session from Supabase.
 * This should be called on app initialization to check for an active session.
 */
export const fetchAndSetUser = createAsyncThunk(
  'auth/fetchAndSetUser',
  async (_, { rejectWithValue }) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) return { user: null, session: null };

      // Although getSession returns the user, getUser validates the token against the server.
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      return { user, session };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch user session.');
    }
  }
);

/**
 * Handles user login with email and password.
 */
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials: SignInWithPasswordCredentials, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword(credentials);
      if (error) throw error;
      if (!data.session || !data.user) throw new Error('Login failed: No session or user returned.');
      return { user: data.user, session: data.session };
    } catch (error: any) {
      return rejectWithValue(error.message || 'An unknown error occurred during login.');
    }
  }
);

/**
 * Handles new user registration.
 */
export const signUpUser = createAsyncThunk(
  'auth/signUpUser',
  async (credentials: SignUpWithPasswordCredentials, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase.auth.signUp(credentials);
      if (error) throw error;
      if (!data.session || !data.user) throw new Error('Signup failed: No session or user returned.');
      // Depending on email confirmation settings, user might not be logged in immediately.
      // The onAuthStateChange listener will handle the final state.
      return { user: data.user, session: data.session };
    } catch (error: any) {
      return rejectWithValue(error.message || 'An unknown error occurred during signup.');
    }
  }
);

/**
 * Handles user logout.
 */
export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return null; // Indicates success
    } catch (error: any) {
      return rejectWithValue(error.message || 'An unknown error occurred during logout.');
    }
  }
);

// --- Auth Slice ---

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Reducer to be called by the onAuthStateChange listener
    setAuth: (state, action: PayloadAction<{ user: User | null; session: Session | null }>) => {
      state.user = action.payload.user;
      state.session = action.payload.session;
      state.status = action.payload.user ? 'succeeded' : 'idle';
      state.isInitialized = true; // Mark as initialized once we get the first auth state
      state.error = null;
    },
    // Reducer to handle auth initialization completion
    setAuthInitialized: (state, action: PayloadAction<boolean>) => {
        state.isInitialized = action.payload;
    },
    // Reducer to clear auth error manually if needed
    clearAuthError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // --- fetchAndSetUser Thunk ---
      .addCase(fetchAndSetUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAndSetUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.session = action.payload.session;
        state.status = action.payload.user ? 'succeeded' : 'idle';
        state.isInitialized = true;
      })
      .addCase(fetchAndSetUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
        state.isInitialized = true; // Still initialized, just failed to get a user
      })
      // --- loginUser Thunk ---
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.session = action.payload.session;
        state.status = 'succeeded';
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      // --- signUpUser Thunk ---
      .addCase(signUpUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(signUpUser.fulfilled, (state, action) => {
        // State will be updated by onAuthStateChange listener if email confirmation is off
        // If confirmation is required, user is not logged in yet.
        state.status = 'idle'; // Or a specific status like 'awaiting_confirmation'
      })
      .addCase(signUpUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      // --- logoutUser Thunk ---
      .addCase(logoutUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.session = null;
        state.status = 'idle';
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
        // Even if logout fails, clear local state as a safety measure
        state.user = null;
        state.session = null;
      });
  },
});

// --- Export Actions ---
export const { setAuth, setAuthInitialized, clearAuthError } = authSlice.actions;

// --- Export Selectors ---
export const selectCurrentUser = (state: RootState): User | null => state.auth.user;
export const selectCurrentSession = (state: RootState): Session | null => state.auth.session;
export const selectIsAuthenticated = (state: RootState): boolean => !!state.auth.user && !!state.auth.session;
export const selectAuthStatus = (state: RootState): AuthStatus => state.auth.status;
export const selectAuthError = (state: RootState): string | null => state.auth.error;
export const selectIsAuthInitialized = (state: RootState): boolean => state.auth.isInitialized;


// --- Export Reducer ---
export default authSlice.reducer;
