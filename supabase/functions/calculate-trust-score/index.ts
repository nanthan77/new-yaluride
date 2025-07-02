// supabase/functions/calculate-trust-score/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// --- Type Definitions for Database Tables ---
interface Profile {
  id: string;
  role: 'PASSENGER' | 'DRIVER';
  avatar_url: string | null;
  email: string | null; // Assuming email is in profiles, not just auth.users
  created_at: string;
}

interface DriverVerification {
  user_id: string;
  id_verified: boolean;
  license_verified: boolean;
  police_clearance_verified: boolean;
}

interface RideStats {
  completed_rides_count: number;
  average_rating: number | null;
  ratings_count: number;
}

// --- Scoring Constants (out of 100) ---
const SCORE_WEIGHTS = {
  PROFILE_COMPLETENESS: 15,
  VERIFICATION_STATUS: 30,
  RIDE_HISTORY: 25,
  USER_RATINGS: 20,
  PLATFORM_SENIORITY: 10,
};

// --- Scoring Logic Implementation ---

/**
 * Calculates score based on profile completeness.
 * @param profile - The user's profile data.
 * @returns A score between 0 and SCORE_WEIGHTS.PROFILE_COMPLETENESS.
 */
function calculateProfileCompletenessScore(profile: Profile): number {
  let score = 0;
  if (profile.avatar_url) {
    score += 7; // Points for having a profile picture
  }
  if (profile.email) {
    score += 8; // Points for having an email address
  }
  return Math.min(score, SCORE_WEIGHTS.PROFILE_COMPLETENESS);
}

/**
 * Calculates score based on verification status, primarily for drivers.
 * @param verification - The driver's verification data.
 * @param isDriver - Flag indicating if the user is a driver.
 * @returns A score between 0 and SCORE_WEIGHTS.VERIFICATION_STATUS.
 */
function calculateVerificationScore(verification: DriverVerification | null, isDriver: boolean): number {
  if (!isDriver || !verification) {
    // Passengers get a base score for being on the platform
    return 5; 
  }
  let score = 0;
  if (verification.id_verified) score += 10;
  if (verification.license_verified) score += 10;
  if (verification.police_clearance_verified) score += 10;
  return Math.min(score, SCORE_WEIGHTS.VERIFICATION_STATUS);
}

/**
 * Calculates score based on the number of completed rides.
 * Uses a logarithmic scale to reward new users while still valuing experience.
 * @param rideCount - The total number of completed rides.
 * @returns A score between 0 and SCORE_WEIGHTS.RIDE_HISTORY.
 */
function calculateRideHistoryScore(rideCount: number): number {
  if (rideCount === 0) return 0;
  // Logarithmic scaling: score grows quickly at first, then slows down.
  // `Math.log10(rideCount + 1)` ensures it starts at 0 and grows.
  // The multiplier is chosen to scale the score appropriately.
  // e.g., 1 ride ~3pts, 10 rides ~10pts, 100 rides ~20pts, 200+ rides approach 25.
  const score = Math.log10(rideCount + 1) * 10;
  return Math.min(score, SCORE_WEIGHTS.RIDE_HISTORY);
}

/**
 * Calculates score based on user ratings.
 * It considers both the average rating and the number of ratings received.
 * @param avgRating - The average rating of the user.
 * @param ratingsCount - The total number of ratings received.
 * @returns A score between 0 and SCORE_WEIGHTS.USER_RATINGS.
 */
function calculateRatingScore(avgRating: number | null, ratingsCount: number): number {
  if (avgRating === null || ratingsCount === 0) return 0;
  
  // Normalize average rating to a scale of 0-1
  const normalizedRating = (Math.max(0, avgRating - 1)) / 4; // Assumes rating is 1-5
  
  // Confidence factor based on number of ratings (approaches 1 as ratingsCount increases)
  const confidence = 1 - (1 / (ratingsCount + 1));
  
  const score = normalizedRating * confidence * SCORE_WEIGHTS.USER_RATINGS;
  return Math.min(score, SCORE_WEIGHTS.USER_RATINGS);
}

/**
 * Calculates score based on the user's account age.
 * @param createdAt - The ISO timestamp of account creation.
 * @returns A score between 0 and SCORE_WEIGHTS.PLATFORM_SENIORITY.
 */
function calculateSeniorityScore(createdAt: string): number {
  const accountAgeInMonths = (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  // Award 1 point per month for the first 10 months.
  const score = Math.min(accountAgeInMonths, 10);
  return Math.min(score, SCORE_WEIGHTS.PLATFORM_SENIORITY);
}


// --- Main Edge Function Handler ---

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Ensure the request method is POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      });
    }

    const { userId } = await req.json();
    if (!userId) {
      throw new Error('userId is required.');
    }

    // Initialize Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // --- Fetch all required data in parallel ---
    const [profilePromise, driverVerificationPromise, rideStatsPromise] = [
      supabaseClient.from('profiles').select('id, role, avatar_url, email, created_at').eq('id', userId).single(),
      supabaseClient.from('drivers').select('user_id, id_verified, license_verified, police_clearance_verified').eq('user_id', userId).single(),
      supabaseClient.from('rides').select('rating', { count: 'exact' }).eq('status', 'COMPLETED').or(`driver_id.eq.${userId},passenger_id.eq.${userId}`)
    ];

    const [{ data: profile, error: profileError }, { data: driverVerification, error: driverVerificationError }, { data: rides, count: completedRidesCount, error: rideError }] = await Promise.all([
      profilePromise,
      driverVerificationPromise,
      rideStatsPromise
    ]);

    if (profileError) throw new Error(`Failed to fetch profile: ${profileError.message}`);
    if (!profile) throw new Error(`Profile not found for userId: ${userId}`);
    // driverVerificationError is okay if the user is not a driver.
    if (rideError) throw new Error(`Failed to fetch ride data: ${rideError.message}`);

    const isDriver = profile.role === 'DRIVER';

    // Aggregate ride stats
    const validRides = rides?.filter(r => r.rating !== null) || [];
    const ratingsCount = validRides.length;
    const averageRating = ratingsCount > 0 ? validRides.reduce((sum, r) => sum + r.rating!, 0) / ratingsCount : null;
    
    const rideStats: RideStats = {
        completed_rides_count: completedRidesCount ?? 0,
        average_rating: averageRating,
        ratings_count: ratingsCount,
    };

    // --- Calculate all score components ---
    const profileScore = calculateProfileCompletenessScore(profile);
    const verificationScore = calculateVerificationScore(driverVerification, isDriver);
    const historyScore = calculateRideHistoryScore(rideStats.completed_rides_count);
    const ratingScore = calculateRatingScore(rideStats.average_rating, rideStats.ratings_count);
    const seniorityScore = calculateSeniorityScore(profile.created_at);

    // --- Sum up and cap the final score ---
    const totalScore = Math.round(
      profileScore + verificationScore + historyScore + ratingScore + seniorityScore
    );
    const finalScore = Math.min(totalScore, 100);

    // --- Update the user's profile with the new score ---
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ trust_score: finalScore, trust_score_last_updated: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) {
      throw new Error(`Failed to update trust score: ${updateError.message}`);
    }

    const responsePayload = {
      userId,
      trustScore: finalScore,
      breakdown: {
        profileCompleteness: profileScore,
        verificationStatus: verificationScore,
        rideHistory: historyScore,
        userRatings: ratingScore,
        platformSeniority: seniorityScore,
      },
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
