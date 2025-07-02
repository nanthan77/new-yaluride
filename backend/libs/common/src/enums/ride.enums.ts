export enum RideStatus {
  PENDING = 'pending',
  REQUESTED = 'requested',
  ACCEPTED = 'accepted',
  SCHEDULED = 'scheduled',
  DRIVER_EN_ROUTE = 'driver_en_route',
  DRIVER_ARRIVED = 'driver_arrived',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED_BY_PASSENGER = 'cancelled_by_passenger',
  CANCELLED_BY_DRIVER = 'cancelled_by_driver',
  CANCELLED = 'cancelled',
  PASSENGER_NO_SHOW = 'passenger_no_show',
  DRIVER_NO_SHOW = 'driver_no_show',
}

export enum VehicleType {
  CAR = 'car',
  MOTORCYCLE = 'motorcycle',
  VAN = 'van',
  TRUCK = 'truck',
  BUS = 'bus',
  SUV = 'suv',
  TUKTUK = 'tuktuk',
  BIKE = 'bike',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}
