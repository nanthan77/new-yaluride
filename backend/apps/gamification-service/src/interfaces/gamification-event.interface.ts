export interface GamificationEvent {
  type: GamificationEventType;
  userId: string;
  payload: any;
}

export enum GamificationEventType {
  RIDE_COMPLETED = 'ride_completed',
  RATING_GIVEN = 'rating_given',
  REFERRAL_MADE = 'referral_made',
  DAILY_LOGIN = 'daily_login',
}
