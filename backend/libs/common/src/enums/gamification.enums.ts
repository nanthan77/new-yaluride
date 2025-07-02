export enum GamificationEventType {
  RIDE_COMPLETED = 'ride_completed',
  RATING_GIVEN = 'rating_given',
  REFERRAL_COMPLETED = 'referral_completed',
  PROFILE_COMPLETED = 'profile_completed',
  BADGE_AWARDED = 'badge_awarded',
}

export enum PointReason {
  RIDE_COMPLETED = 'ride_completed',
  FIVE_STAR_RATING = 'five_star_rating',
  BADGE_AWARDED = 'badge_awarded',
  REFERRAL_BONUS = 'referral_bonus',
  PROFILE_COMPLETION = 'profile_completion',
}

export interface GamificationEvent {
  type: GamificationEventType;
  payload: {
    userId: string;
    rideId?: string;
    rating?: number;
    rideFare?: number;
    [key: string]: any;
  };
}
