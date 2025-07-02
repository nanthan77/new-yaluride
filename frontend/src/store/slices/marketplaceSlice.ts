import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../../services/supabaseClient'; // Adjust path
import { RootState } from '../index';
import { UserProfile, UUID } from '../../types/yaluride'; // Adjust path

// --- TypeScript Types ---

export enum JourneyStatus {
  OPEN = 'OPEN',
  CONFIRMED = 'CONFIRMED', // A bid has been accepted
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export interface Journey {
  id: UUID;
  passenger_id: UUID;
  pickup_location_text: string;
  dropoff_location_text: string;
  pickup_coords?: { lat: number; lng: number }; // GeoJSON or simple object
  dropoff_coords?: { lat: number; lng: number };
  departure_time: string; // ISO 8601 string
  passenger_count: number;
  notes?: string;
  status: JourneyStatus;
  created_at: string;
  bids_count?: number; // Comes from a view or join
  passenger?: Pick<UserProfile, 'id' | 'display_name' | 'avatar_url' | 'avg_rating_as_passenger'>; // Nested passenger info
}

export interface Bid {
  id: UUID;
  journey_id: UUID;
  driver_id: UUID;
  amount: number;
  driver_eta_minutes?: number; // Driver's ETA to pickup point
  message?: string;
  created_at: string;
  driver?: Pick<UserProfile, 'id' | 'display_name' | 'avatar_url' | 'avg_rating_as_driver'>; // Nested driver info
}

export interface JourneyFilters {
  pickupQuery?: string;
  dropoffQuery?: string;
  date?: string; // YYYY-MM-DD
  sortBy: 'newest' | 'departure_time' | 'lowest_bids';
}

type MarketplaceStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface MarketplaceState {
  journeys: {
    items: Journey[];
    total: number;
    currentPage: number;
    hasMore: boolean;
  };
  bids: {
    [journeyId: UUID]: Bid[];
  };
  filters: JourneyFilters;
  status: MarketplaceStatus;
  bidsStatus: MarketplaceStatus; // Separate status for loading bids
  error: string | null;
}

// --- Initial State ---

const initialState: MarketplaceState = {
  journeys: {
    items: [],
    total: 0,
    currentPage: 0,
    hasMore: true,
  },
  bids: {},
  filters: {
    sortBy: 'newest',
  },
  status: 'idle',
  bidsStatus: 'idle',
  error: null,
};

// --- Async Thunks ---

export const fetchJourneys = createAsyncThunk(
  'marketplace/fetchJourneys',
  async ({ filters, page = 1 }: { filters: JourneyFilters; page?: number }, { rejectWithValue }) => {
    try {
      let query = supabase
        .from('journeys')
        .select(`
          *,
          passenger:profiles!passenger_id (id, display_name, avatar_url, avg_rating_as_passenger),
          bids_count:bids(count)
        `)
        .eq('status', JourneyStatus.OPEN) // Only fetch open journeys
        .range((page - 1) * 10, page * 10 - 1); // Pagination

      // Apply filters
      if (filters.pickupQuery) {
        query = query.textSearch('pickup_location_text', filters.pickupQuery, { type: 'websearch' });
      }
      if (filters.dropoffQuery) {
        query = query.textSearch('dropoff_location_text', filters.dropoffQuery, { type: 'websearch' });
      }
      if (filters.date) {
        query = query.gte('departure_time', `${filters.date}T00:00:00Z`)
                     .lt('departure_time', `${filters.date}T23:59:59Z`);
      }

      // Apply sorting
      if (filters.sortBy === 'departure_time') {
        query = query.order('departure_time', { ascending: true });
      } else { // 'newest' is default
        query = query.order('created_at', { ascending: false });
      }
      
      const { data, error, count } = await query;

      if (error) throw error;
      
      // Supabase returns total count in `count` when `count` option is used in select
      // Here we simulate it as it's a bit complex with foreign table counts
      const totalCount = data.length < 10 ? (page - 1) * 10 + data.length : page * 10 + 1; // Simplified total count logic

      return { journeys: data, page, total: totalCount };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const postJourney = createAsyncThunk(
  'marketplace/postJourney',
  async (journeyData: Omit<Journey, 'id' | 'created_at' | 'status' | 'passenger_id'>, { getState, rejectWithValue }) => {
    const { auth } = getState() as RootState;
    if (!auth.user) return rejectWithValue('User not authenticated');
    
    try {
      const { data, error } = await supabase
        .from('journeys')
        .insert([{ ...journeyData, passenger_id: auth.user.id, status: JourneyStatus.OPEN }])
        .select()
        .single();
      
      if (error) throw error;
      return data as Journey;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const placeBid = createAsyncThunk(
  'marketplace/placeBid',
  async (bidData: { journey_id: UUID; amount: number; message?: string }, { getState, rejectWithValue }) => {
    const { auth } = getState() as RootState;
    if (!auth.user) return rejectWithValue('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('bids')
        .insert([{ ...bidData, driver_id: auth.user.id }])
        .select(`*, driver:profiles!driver_id(id, display_name, avatar_url, avg_rating_as_driver)`)
        .single();

      if (error) throw error;
      return data as Bid;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchBidsForJourney = createAsyncThunk(
  'marketplace/fetchBidsForJourney',
  async (journeyId: UUID, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('bids')
        .select(`*, driver:profiles!driver_id(id, display_name, avatar_url, avg_rating_as_driver)`)
        .eq('journey_id', journeyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { journeyId, bids: data as Bid[] };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// --- Marketplace Slice ---

const marketplaceSlice = createSlice({
  name: 'marketplace',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<JourneyFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
      // Reset journeys when filters change to trigger a new fetch
      state.journeys.items = [];
      state.journeys.currentPage = 0;
      state.journeys.hasMore = true;
      state.status = 'idle';
    },
    addJourneyRealtime: (state, action: PayloadAction<Journey>) => {
      const newJourney = action.payload;
      // Avoid duplicates
      if (!state.journeys.items.find(j => j.id === newJourney.id)) {
        state.journeys.items.unshift(newJourney); // Add to the top of the list
        state.journeys.total += 1;
      }
    },
    addBidRealtime: (state, action: PayloadAction<Bid>) => {
      const newBid = action.payload;
      const { journey_id } = newBid;

      // Add bid to the specific journey's bid list
      if (!state.bids[journey_id]) {
        state.bids[journey_id] = [];
      }
      // Avoid duplicates
      if (!state.bids[journey_id].find(b => b.id === newBid.id)) {
        state.bids[journey_id].unshift(newBid);
      }

      // Update the bids_count on the journey in the main list
      const journeyIndex = state.journeys.items.findIndex(j => j.id === journey_id);
      if (journeyIndex > -1) {
        const journey = state.journeys.items[journeyIndex];
        journey.bids_count = (journey.bids_count || 0) + 1;
      }
    },
    clearMarketplaceError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // --- Fetch Journeys ---
      .addCase(fetchJourneys.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchJourneys.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (action.payload.page === 1) {
          state.journeys.items = action.payload.journeys;
        } else {
          state.journeys.items.push(...action.payload.journeys);
        }
        state.journeys.currentPage = action.payload.page;
        state.journeys.hasMore = action.payload.journeys.length === 10; // Assuming page size is 10
        // state.journeys.total = action.payload.total; // Uncomment if total count is reliable
      })
      .addCase(fetchJourneys.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      // --- Post Journey ---
      .addCase(postJourney.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(postJourney.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Add the new journey to the top of the list for immediate UI feedback
        state.journeys.items.unshift(action.payload);
      })
      .addCase(postJourney.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      // --- Place Bid ---
      .addCase(placeBid.pending, (state) => {
        state.bidsStatus = 'loading'; // Use separate status for bid actions
      })
      .addCase(placeBid.fulfilled, (state, action) => {
        state.bidsStatus = 'succeeded';
        // This is handled optimistically by the real-time reducer,
        // but we can add it here as a fallback.
        const newBid = action.payload;
        if (!state.bids[newBid.journey_id]) state.bids[newBid.journey_id] = [];
        if (!state.bids[newBid.journey_id].find(b => b.id === newBid.id)) {
          state.bids[newBid.journey_id].unshift(newBid);
          const journeyIndex = state.journeys.items.findIndex(j => j.id === newBid.journey_id);
          if (journeyIndex > -1) {
            state.journeys.items[journeyIndex].bids_count = (state.journeys.items[journeyIndex].bids_count || 0) + 1;
          }
        }
      })
      .addCase(placeBid.rejected, (state, action) => {
        state.bidsStatus = 'failed';
        state.error = action.payload as string;
      })
      // --- Fetch Bids for Journey ---
      .addCase(fetchBidsForJourney.pending, (state) => {
        state.bidsStatus = 'loading';
      })
      .addCase(fetchBidsForJourney.fulfilled, (state, action) => {
        state.bidsStatus = 'succeeded';
        state.bids[action.payload.journeyId] = action.payload.bids;
      })
      .addCase(fetchBidsForJourney.rejected, (state, action) => {
        state.bidsStatus = 'failed';
        state.error = action.payload as string;
      });
  },
});

// --- Export Actions ---
export const { setFilters, addJourneyRealtime, addBidRealtime, clearMarketplaceError } = marketplaceSlice.actions;

// --- Export Selectors ---
export const selectAllJourneys = (state: RootState) => state.marketplace.journeys.items;
export const selectJourneyById = (journeyId: UUID) => (state: RootState) => state.marketplace.journeys.items.find(j => j.id === journeyId);
export const selectBidsForJourney = (journeyId: UUID) => (state: RootState) => state.marketplace.bids[journeyId] || [];
export const selectMarketplaceStatus = (state: RootState) => state.marketplace.status;
export const selectBidsStatus = (state: RootState) => state.marketplace.bidsStatus;
export const selectMarketplaceError = (state: RootState) => state.marketplace.error;
export const selectJourneyFilters = (state: RootState) => state.marketplace.filters;
export const selectMarketplacePagination = (state: RootState) => ({
    currentPage: state.marketplace.journeys.currentPage,
    hasMore: state.marketplace.journeys.hasMore,
});


// --- Export Reducer ---
export default marketplaceSlice.reducer;
