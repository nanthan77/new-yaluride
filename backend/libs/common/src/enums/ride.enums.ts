export enum RideStatus {
  SCHEDULED = 'scheduled',
  DRIVER_EN_ROUTE = 'driver_en_route',
  DRIVER_ARRIVED = 'driver_arrived',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED_BY_PASSENGER = 'cancelled_by_passenger',
  CANCELLED_BY_DRIVER = 'cancelled_by_driver',
  PASSENGER_NO_SHOW = 'passenger_no_show',
  DRIVER_NO_SHOW = 'driver_no_show',
}

export enum VehicleType {
  CAR = 'car',
  MOTORCYCLE = 'motorcycle',
  VAN = 'van',
  TRUCK = 'truck',
  BUS = 'bus',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum PointReason {
  RIDE_COMPLETED = 'ride_completed',
  FIVE_STAR_RATING = 'five_star_rating',
  BADGE_AWARDED = 'badge_awarded',
  REFERRAL_BONUS = 'referral_bonus',
  DAILY_LOGIN = 'daily_login',
}
