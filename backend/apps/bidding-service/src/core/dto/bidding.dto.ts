export class CreateBidDto {
  journeyId: string;
  amount: number;
  message?: string;
}

export class BidResponseDto {
  id: string;
  journeyId: string;
  driverId: string;
  amount: number;
  message?: string;
  status: string;
  createdAt: Date;

  constructor(bid: any) {
    this.id = bid.id;
    this.journeyId = bid.journey_id;
    this.driverId = bid.driver_id;
    this.amount = bid.amount;
    this.message = bid.message;
    this.status = bid.status;
    this.createdAt = bid.created_at;
  }
}

export class RideResponseDto {
  id: string;
  passengerId: string;
  driverId: string;
  status: string;
  fare: number;

  constructor(ride: any) {
    this.id = ride.id;
    this.passengerId = ride.passenger_id;
    this.driverId = ride.driver_id;
    this.status = ride.status;
    this.fare = ride.fare;
  }
}

export class BidSuggestionResponseDto {
  suggestedAmount: number;
  minAmount: number;
  maxAmount: number;
  confidence: number;
  factors: string[];
  message: string;

  constructor(data: any) {
    this.suggestedAmount = data.suggestedAmount;
    this.minAmount = data.minAmount;
    this.maxAmount = data.maxAmount;
    this.confidence = data.confidence;
    this.factors = data.factors || [];
    this.message = data.message;
  }
}

export class SuggestedBidResponseDto {
  suggestedAmount: number;
  minAmount: number;
  maxAmount: number;
  confidence: number;
  factors: string[];
  message: string;

  constructor(data: any) {
    this.suggestedAmount = data.suggestedAmount;
    this.minAmount = data.minAmount;
    this.maxAmount = data.maxAmount;
    this.confidence = data.confidence;
    this.factors = data.factors || [];
    this.message = data.message;
  }
}
