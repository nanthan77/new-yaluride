import { Injectable, Logger } from '@nestjs/common';
import { Journey } from '../../journey/src/core/entities/journey.entity'; // Adjust path based on your monorepo structure
import { VehicleType } from '../../../../libs/common/src/enums/ride.enums';
import { SuggestedBidResponseDto } from './core/dto/bidding.dto';

// --- Pricing Model Constants ---
// These values should be moved to a configuration service in a production environment.
const BASE_RATE_PER_KM_LKR = 50; // LKR per kilometer
const BASE_RATE_PER_MINUTE_LKR = 5; // LKR per minute
const MINIMUM_FARE_LKR = 250; // Minimum possible fare for any trip

// Time-based multipliers
const PEAK_HOUR_MULTIPLIER = 1.25; // 25% surcharge during peak hours
const WEEKEND_MULTIPLIER = 1.15; // 15% surcharge on weekends
const PEAK_HOURS = [7, 8, 9, 17, 18, 19]; // 7-10 AM and 5-8 PM

// Vehicle type premiums (as multipliers)
const VEHICLE_PREMIUMS: Record<VehicleType, number> = {
  [VehicleType.CAR]: 1.0,
  [VehicleType.VAN]: 1.5,
  [VehicleType.SUV]: 1.4,
  [VehicleType.TUKTUK]: 0.8,
  [VehicleType.BIKE]: 0.6,
};

// Controls the range of the price suggestion (e.g., +/- 15%)
const SUGGESTION_RANGE_PERCENTAGE = 0.15;

@Injectable()
export class BiddingStrategyService {
  private readonly logger = new Logger(BiddingStrategyService.name);

  /**
   * Calculates a suggested bid price range for a given journey.
   *
   * @param journey - The journey details for which to calculate a bid.
   * @returns A SuggestedBidResponseDto containing min, recommended, and max bid suggestions.
   */
  getSuggestedBid(journey: Journey): SuggestedBidResponseDto {
    this.logger.log(`Calculating suggested bid for Journey ID: ${journey.id}`);

    // 1. Calculate Base Fare
    // In a real scenario, distance and duration would be estimated from a routing service.
    // Here we'll use placeholder values if they don't exist on the journey object.
    const distanceKm = (journey.distance_meters || 10000) / 1000; // Default to 10km
    const durationMinutes = (journey.estimated_duration_seconds || 1800) / 60; // Default to 30 mins
    const baseFare = this._calculateBaseFare(distanceKm, durationMinutes);

    // 2. Get Multipliers
    const demandMultiplier = this._getDemandMultiplier(journey.pickup_address);
    const timeMultiplier = this._getTimeMultiplier(new Date(journey.scheduled_at));
    const vehiclePremium = this._getVehiclePremium(journey.vehicle_types);

    // 3. Calculate Recommended Bid
    let recommendedBid = baseFare * demandMultiplier * timeMultiplier * vehiclePremium;

    // Ensure the bid is not below the minimum fare
    recommendedBid = Math.max(recommendedBid, MINIMUM_FARE_LKR);

    // 4. Calculate Price Range
    const priceVariation = recommendedBid * SUGGESTION_RANGE_PERCENTAGE;
    const minBid = Math.round((recommendedBid - priceVariation) / 50) * 50; // Round to nearest 50 LKR
    const maxBid = Math.round((recommendedBid + priceVariation) / 50) * 50; // Round to nearest 50 LKR
    const roundedRecommendedBid = Math.round(recommendedBid / 50) * 50;

    // Logging the calculation breakdown for traceability
    this.logger.debug({
      message: `Bid Calculation for Journey ${journey.id}`,
      journeyId: journey.id,
      baseFare,
      distanceKm,
      durationMinutes,
      demandMultiplier,
      timeMultiplier,
      vehiclePremium,
      calculatedRecommendedBid: recommendedBid,
      finalSuggestion: {
        min_bid: minBid,
        recommended_bid: roundedRecommendedBid,
        max_bid: maxBid,
      },
    });

    return {
      min_bid: minBid,
      recommended_bid: roundedRecommendedBid,
      max_bid: maxBid,
      currency: journey.currency || 'LKR',
    };
  }

  /**
   * Calculates the base fare from distance and duration.
   */
  private _calculateBaseFare(distanceKm: number, durationMinutes: number): number {
    const distanceFare = distanceKm * BASE_RATE_PER_KM_LKR;
    const timeFare = durationMinutes * BASE_RATE_PER_MINUTE_LKR;
    return distanceFare + timeFare;
  }

  /**
   * Simulates a demand-based surcharge multiplier.
   * In a real system, this would query a demand service or use geospatial data.
   */
  private _getDemandMultiplier(pickupAddress: string): number {
    const address = pickupAddress.toLowerCase();
    if (address.includes('airport') || address.includes('cmb')) {
      return 1.3; // 30% surcharge for airport pickups
    }
    if (address.includes('fort') || address.includes('colombo 1')) {
      return 1.2; // 20% surcharge for Colombo Fort
    }
    if (address.includes('galle face') || address.includes('one galle face')) {
        return 1.15; // 15% surcharge
    }
    return 1.0; // Default: no demand surcharge
  }

  /**
   * Calculates a time-based surcharge for peak hours and weekends.
   */
  private _getTimeMultiplier(scheduledAt: Date): number {
    const day = scheduledAt.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = scheduledAt.getHours();

    const isWeekend = day === 0 || day === 6;
    const isPeakHour = PEAK_HOURS.includes(hour);

    if (isPeakHour) {
      this.logger.debug(`Applying peak hour multiplier of ${PEAK_HOUR_MULTIPLIER}`);
      return PEAK_HOUR_MULTIPLIER;
    }
    if (isWeekend) {
      this.logger.debug(`Applying weekend multiplier of ${WEEKEND_MULTIPLIER}`);
      return WEEKEND_MULTIPLIER;
    }
    return 1.0; // Default: no time-based surcharge
  }

  /**
   * Calculates a premium based on the requested vehicle type(s).
   */
  private _getVehiclePremium(vehicleTypes: VehicleType[] | null): number {
    if (!vehicleTypes || vehicleTypes.length === 0) {
      return VEHICLE_PREMIUMS[VehicleType.CAR]; // Default to car if not specified
    }
    // If multiple types are allowed, we could average them or take the max.
    // Taking the average seems fair.
    const totalPremium = vehicleTypes.reduce((sum, type) => {
      return sum + (VEHICLE_PREMIUMS[type] || 1.0);
    }, 0);

    const averagePremium = totalPremium / vehicleTypes.length;
    this.logger.debug(`Calculated vehicle premium of ${averagePremium} for types: ${vehicleTypes.join(', ')}`);
    return averagePremium;
  }
}
