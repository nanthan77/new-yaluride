import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Journey, Driver, Ride, User } from '@yaluride/database';

// --- Type Definitions ---

interface MatchedDriver {
  driver: Driver;
  score: number;
  matchDetails: {
    distanceScore: number;
    ratingScore: number;
    vehicleTypeScore: number;
  };
}

// --- Constants for Scoring ---
const MAX_SEARCH_RADIUS_METERS = 5000; // 5km
const WEIGHT_DISTANCE = 0.6;
const WEIGHT_RATING = 0.3;
const WEIGHT_VEHICLE_TYPE = 0.1;

@Injectable()
export class MatchingAlgorithmService {
  private readonly logger = new Logger(MatchingAlgorithmService.name);

  constructor(
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    @InjectRepository(Journey)
    private readonly journeyRepository: Repository<Journey>,
    @InjectRepository(Ride)
    private readonly rideRepository: Repository<Ride>,
    // Assuming a User repository is available for passenger gender checks
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Finds the best-matched drivers for a given journey.
   * This now includes a filter for "Women-Only" rides.
   *
   * @param journey - The journey object for which to find drivers.
   * @returns A promise that resolves to a sorted array of matched drivers.
   */
  async findBestMatches(journey: Journey): Promise<MatchedDriver[]> {
    this.logger.log(`Starting match search for Journey ID: ${journey.id}`);

    // 1. Find available drivers within a geographic radius
    const originPoint = `POINT(${journey.pickup_longitude} ${journey.pickup_latitude})`;

    const queryBuilder = this.driverRepository.createQueryBuilder('driver');

    queryBuilder
      .select([
        'driver.id',
        'driver.user_id',
        'driver.current_location',
        'driver.avg_rating',
        'driver.vehicle_type',
        'driver.accepts_women_only_rides', // Select for logging/verification
        'user.gender', // Select for logging/verification
      ])
      .addSelect(
        `ST_Distance(driver.current_location, ST_GeomFromText(:origin, 4326))`,
        'distance',
      )
      .leftJoin('driver.user', 'user') // Join with user table to access gender
      .where('driver.is_available = :isAvailable', { isAvailable: true })
      .andWhere(
        `ST_DWithin(driver.current_location, ST_GeomFromText(:origin, 4326), :radius)`,
        {
          origin: originPoint,
          radius: MAX_SEARCH_RADIUS_METERS,
        },
      )
      .orderBy('distance', 'ASC');

    // ** MODIFICATION: Apply Women-Only Ride Filter for Drivers **
    //   this.logger.log(`Applying Women-Only filter for Journey ID: ${journey.id}`);
    //   queryBuilder
    //     .andWhere('user.gender = :gender', { gender: 'FEMALE' })
    //     .andWhere('driver.accepts_women_only_rides = :accepts', { accepts: true });
    // }

    const availableDrivers = await queryBuilder.getRawAndEntities();

    if (availableDrivers.entities.length === 0) {
      this.logger.warn(`No available drivers found within radius for Journey ID: ${journey.id}`);
      return [];
    }

    // 2. Score each driver based on multiple criteria
    const scoredDrivers = availableDrivers.entities.map((driver, index) => {
      const distance = availableDrivers.raw[index].distance;
      const distanceScore = 1 - distance / MAX_SEARCH_RADIUS_METERS;
      const ratingScore = (driver.rating || 4.0) / 5.0;
      const vehicleTypeScore = 1.0; // TODO: Implement vehicle type matching logic

      const finalScore =
        distanceScore * WEIGHT_DISTANCE +
        ratingScore * WEIGHT_RATING +
        vehicleTypeScore * WEIGHT_VEHICLE_TYPE;

      return {
        driver,
        score: finalScore,
        matchDetails: {
          distanceScore,
          ratingScore,
          vehicleTypeScore,
        },
      };
    });

    // 3. Sort drivers by their final score in descending order
    const sortedMatches = scoredDrivers.sort((a, b) => b.score - a.score);

    this.logger.log(`Found and scored ${sortedMatches.length} drivers for Journey ID: ${journey.id}`);
    return sortedMatches;
  }

  /**
   * Finds potential passengers to add to an existing shared ride.
   * This now includes a filter for "Women-Only" shared rides.
   *
   * @param ride - The existing shared ride.
   * @returns A promise that resolves to an array of potential journeys to merge.
   */
  async findPotentialPassengersForSharedRide(ride: Ride): Promise<Journey[]> {
    this.logger.log(`Searching for potential passengers to join shared ride ID: ${ride.id}`);

    const originalJourney = await this.journeyRepository.findOne({
        where: { id: ride.id } // Using ride ID as placeholder since journeyId not in Ride entity
    });

    if (!originalJourney) {
        this.logger.error(`Original journey for ride ${ride.id} not found.`);
        return [];
    }

    // This is a simplified logic. A real implementation would involve complex
    // geospatial queries to find journeys along the same route corridor.
    const queryBuilder = this.journeyRepository.createQueryBuilder('journey')
        .innerJoinAndSelect('journey.passenger', 'passenger') // Assuming relation to passenger (user)
        .where('journey.id != :originalJourneyId', { originalJourneyId: originalJourney.id })
        .andWhere('journey.is_shared_ride_accepted = :isShared', { isShared: true })
        .andWhere('journey.status = :status', { status: 'PENDING' }) // Find journeys that are not yet part of a ride
        .andWhere('journey.scheduled_time BETWEEN :startTime AND :endTime', {
            startTime: new Date(new Date(originalJourney.scheduled_time).getTime() - 15 * 60000), // 15 mins before
            endTime: new Date(new Date(originalJourney.scheduled_time).getTime() + 15 * 60000),   // 15 mins after
        })
        // A placeholder for a complex route matching condition
        .andWhere('ST_DWithin(journey.origin_location, :origin, :radius)', {
            origin: `POINT(${originalJourney.pickup_longitude} ${originalJourney.pickup_latitude})`,
            radius: 2000, // within 2km of original start
        });

    // ** MODIFICATION: Apply Women-Only Ride Filter for Passengers **
    //     this.logger.log(`Applying Women-Only filter for finding shared ride passengers for Ride ID: ${ride.id}`);
    //     queryBuilder.andWhere('passenger.gender = :gender', { gender: 'FEMALE' });
    // }

    const potentialJourneys = await queryBuilder.getMany();

    if (potentialJourneys.length > 0) {
        this.logger.log(`Found ${potentialJourneys.length} potential passengers for ride ${ride.id}`);
    }

    // Further filtering based on route overlap would happen here.
    // For now, we return the journeys found within the vicinity.
    return potentialJourneys;
  }
}
