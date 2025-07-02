import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { RideStatus, VehicleType } from '@yaluride/common';
import { Ride } from '@yaluride/database';
import { Expose, Type } from 'class-transformer';

// --- DTO for creating a ride request ---
export class CreateRideRequestDto {
  @ApiProperty({ description: 'The ID of the journey this ride is based on.' })
  @IsUUID()
  journeyId: string;

  @ApiProperty({ description: 'The ID of the bid that was accepted to create this ride.' })
  @IsUUID()
  bidId: string;
}

// --- DTO for updating a ride's status ---
export class UpdateRideStatusDto {
  @ApiProperty({
    description: 'The new status for the ride.',
    enum: RideStatus,
    example: RideStatus.ONGOING,
  })
  @IsEnum(RideStatus)
  status: RideStatus;

  // Optional payload for specific status updates
  @ApiPropertyOptional({ description: 'Reason for cancellation, required if status is a cancellation type.' })
  @IsOptional()
  @IsString()
  @ValidateIf(o => o.status === RideStatus.CANCELLED_BY_PASSENGER || o.status === RideStatus.CANCELLED_BY_DRIVER)
  @IsNotEmpty({ message: 'A cancellation reason is required when cancelling a ride.' })
  cancellationReason?: string;

  @ApiPropertyOptional({ description: 'The final fare for the ride, required for COMPLETING a ride.' })
  @IsOptional()
  @IsNumber()
  @ValidateIf(o => o.status === RideStatus.COMPLETED)
  @IsNotEmpty({ message: 'Final fare is required to complete a ride.' })
  finalFare?: number;

  @ApiPropertyOptional({ description: 'The final distance in meters, required for COMPLETING a ride.' })
  @IsOptional()
  @IsNumber()
  @ValidateIf(o => o.status === RideStatus.COMPLETED)
  @IsNotEmpty({ message: 'Final distance is required to complete a ride.' })
  distanceMeters?: number;
}

// --- DTO for rating a ride ---
export class RateRideDto {
  @ApiProperty({
    description: 'The rating value, from 1 to 5.',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({
    description: 'An optional comment for the rating.',
    example: 'Great driver, very smooth ride!',
  })
  @IsOptional()
  @IsString()
  comment?: string;
}

// --- DTO for API responses ---
// This controls what data is sent back to the client, hiding sensitive or internal fields.
export class RideResponseDto {
  @ApiProperty({ description: 'The unique identifier for the ride.' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'The ID of the associated journey.' })
  @Expose()
  journey_id: string;

  @ApiProperty({ description: 'The ID of the passenger.' })
  @Expose()
  passenger_id: string;

  @ApiProperty({ description: 'The ID of the driver.' })
  @Expose()
  driver_id: string;

  @ApiProperty({ enum: RideStatus, description: 'The current status of the ride.' })
  @Expose()
  status: RideStatus;

  @ApiProperty({ description: 'The agreed upon fare from the bid.' })
  @Expose()
  @Type(() => Number)
  agreed_fare: number;

  @ApiPropertyOptional({ description: 'The final calculated fare after the ride is completed.' })
  @Expose()
  @Type(() => Number)
  final_fare?: number;

  @ApiProperty({ description: 'The scheduled time for pickup.' })
  @Expose()
  scheduled_pickup_time: Date;

  @ApiPropertyOptional({ description: 'The actual time the ride started.' })
  @Expose()
  started_at?: Date;

  @ApiPropertyOptional({ description: 'The time the ride was completed.' })
  @Expose()
  completed_at?: Date;

  @ApiPropertyOptional({ description: 'The time the ride was cancelled.' })
  @Expose()
  cancelled_at?: Date;
  
  @ApiPropertyOptional({ description: 'The reason for cancellation.' })
  @Expose()
  cancellation_reason?: string;

  @ApiProperty({ description: 'Timestamp of when the ride record was created.' })
  @Expose()
  created_at: Date;

  @ApiProperty({ description: 'Timestamp of the last update to the ride record.' })
  @Expose()
  updated_at: Date;

  constructor(partial: Partial<Ride>) {
    // Use Expose decorator to control which fields are included
    // This constructor can be used to map from the Ride entity
    Object.assign(this, partial);
  }

  /* ------------------------------------------------------------------
   * Ride Service – Shared Rides  (minimal skeleton)
   * ----------------------------------------------------------------- */
}

/* ====================================================================
 * BELOW: Minimal RideService implementation to support shared rides.
 * ==================================================================== */

import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Journey } from '../../../journey/src/core/entities/journey.entity'; // adjust path if necessary
import { RidePassenger } from '../entities/ride-passenger.entity'; // you must create this entity to map ride_passengers table

/** Custom error to unify shared-ride failures */
export class SharedRideError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SharedRideError';
  }
}

@Injectable()
export class RideService {
  private readonly logger = new Logger(RideService.name);

  constructor(
    @InjectRepository(Ride) private rideRepo: Repository<Ride>,
    @InjectRepository(Journey) private journeyRepo: Repository<Journey>,
    @InjectRepository(RidePassenger)
    private ridePassengerRepo: Repository<RidePassenger>,
  ) {}

  /* ------------------------------------------------------------------
   *  Ride Status Management – per-passenger leg handling
   * ----------------------------------------------------------------- */

  /**
   * Update the ride-leg status (waiting, on-board, dropped-off) for an
   * individual passenger in a shared ride.  After updating the record,
   * this will automatically recalculate and update the overall ride
   * status (e.g., switching the ride to ONGOING when the first passenger
   * boards, or to COMPLETED when all passengers are dropped off).
   */
  async updatePassengerLegStatus(
    dto: UpdateRideLegStatusDto,
  ): Promise<void> {
    try {
      const ridePassenger = await this.ridePassengerRepo.findOne({
        where: {
          ride_id: dto.rideId,
          passenger_id: dto.passengerId,
        },
      });

      if (!ridePassenger) {
        throw new NotFoundException(
          'Passenger not found in this ride or ride does not exist',
        );
      }

      // If status is already what we are setting, short-circuit
      if (ridePassenger.status === dto.status) {
        this.logger.verbose(
          `Ride ${dto.rideId} passenger ${dto.passengerId} already in status ${dto.status}`,
        );
        return;
      }

      // Update the per-passenger status
      await this.ridePassengerRepo.update(
        { ride_id: dto.rideId, passenger_id: dto.passengerId },
        { status: dto.status },
      );

      this.logger.log(
        `Updated ride-leg status for ride ${dto.rideId} passenger ${dto.passengerId} to ${dto.status}`,
      );

      // Recalculate overall ride status
      await this.updateOverallRideStatus(dto.rideId);

      // TODO: emit an event such as 'ride_leg_status_updated' for other services
    } catch (err) {
      this.logger.error(
        `Failed to update passenger leg status for ride ${dto.rideId}`,
        err.stack,
      );
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      throw new InternalServerErrorException(
        'Unable to update passenger leg status',
      );
    }
  }

  /**
   * Helper that recalculates and persists the overall ride.status based on
   * all passenger leg statuses for the ride.
   *
   * Logic:
   *  • If at least one passenger has status ON_BOARD → ride.status = ONGOING
   *  • If every passenger has status DROPPED_OFF     → ride.status = COMPLETED
   */
  private async updateOverallRideStatus(rideId: string): Promise<void> {
    const ride = await this.rideRepo.findOne({ where: { id: rideId } });
    if (!ride) {
      this.logger.warn(
        `updateOverallRideStatus called with invalid rideId ${rideId}`,
      );
      return;
    }

    const passengers = await this.ridePassengerRepo.find({
      where: { ride_id: rideId },
      select: ['status'],
    });
    const statuses = passengers.map((p) => p.status);

    const anyOnBoard = statuses.includes(RideLegStatus.ON_BOARD);
    const allDropped = statuses.every(
      (s) => s === RideLegStatus.DROPPED_OFF,
    );

    if (anyOnBoard && ride.status !== RideStatus.ONGOING) {
      await this.rideRepo.update(rideId, {
        status: RideStatus.ONGOING,
        started_at: () => 'NOW()',
      });
      this.logger.log(`Ride ${rideId} set to ONGOING`);
      // TODO: emit 'ride_status_updated' event
    }

    if (allDropped && ride.status !== RideStatus.COMPLETED) {
      await this.rideRepo.update(rideId, {
        status: RideStatus.COMPLETED,
        completed_at: () => 'NOW()',
      });
      this.logger.log(`Ride ${rideId} completed`);
      // TODO: emit 'ride_status_updated' event
    }
  }

  /**
   * Create a ride from an accepted bid.
   * If a ride for the journey already exists (shared-ride),
   * add passenger to that ride instead of creating a new one.
   */
  async createRideFromBid(
    journeyId: string,
    bidId: string,
    passengerId: string,
  ): Promise<Ride> {
    try {
      const journey = await this.journeyRepo.findOne({
        where: { id: journeyId },
      });
      if (!journey) throw new NotFoundException('Journey not found');

      // Check if journey is sharable and an existing ride already created
      const existingRide = await this.rideRepo.findOne({
        where: { journey_id: journeyId },
      });
      if (existingRide) {
        // Delegates to helper
        await this.addPassengerToSharedRide(existingRide.id, passengerId, journeyId);
        return existingRide;
      }

      // Otherwise create a brand-new ride
      const ride = this.rideRepo.create({
        journey_id: journeyId,
        passenger_id: passengerId,
        bid_id: bidId,
        driver_id: null, // will be filled by bid acceptance logic
        status: RideStatus.REQUESTED,
      } as unknown as Ride);
      const saved = await this.rideRepo.save(ride);
      // First passenger gets a row in ride_passengers with seats_booked = 1
      await this.ridePassengerRepo.save({
        ride_id: saved.id,
        passenger_id: passengerId,
        journey_id: journeyId,
        seats_booked: 1,
        fare_contribution: 0, // will be updated by pricing logic
      } as unknown as RidePassenger);

      return saved;
    } catch (err) {
      this.logger.error('Failed to create ride from bid', err.stack);
      if (err instanceof SharedRideError) throw new BadRequestException(err.message);
      throw new InternalServerErrorException('Unable to create ride');
    }
  }

  /**
   * Adds a passenger to an existing shared ride.
   * Ensures capacity and journey linkage are valid.
   */
  async addPassengerToSharedRide(
    rideId: string,
    passengerId: string,
    journeyId: string,
  ): Promise<void> {
    // Check for duplicates
    const alreadyJoined = await this.ridePassengerRepo.findOne({
      where: { ride_id: rideId, passenger_id: passengerId },
    });
    if (alreadyJoined) {
      throw new SharedRideError('Passenger already joined this ride');
    }

    // Capacity check – count current passengers
    const count = await this.ridePassengerRepo.count({ where: { ride_id: rideId } });
    const journey = await this.journeyRepo.findOne({ where: { id: journeyId } });
    if (!journey) throw new NotFoundException('Journey not found');
    if (journey.max_passengers && count >= journey.max_passengers) {
      throw new SharedRideError('Ride is at full capacity');
    }

    // Insert passenger record
    await this.ridePassengerRepo.save({
      ride_id: rideId,
      passenger_id: passengerId,
      journey_id: journeyId,
      seats_booked: 1,
      fare_contribution: 0, // pricing logic TBD
    } as unknown as RidePassenger);

    // Update booked_seats on journey
    await this.journeyRepo.update(journeyId, { booked_seats: () => 'booked_seats + 1' });
  }
}
