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
import { RideStatus, VehicleType } from '../../../../libs/common/src/enums/ride.enums';
import { Ride } from '../entities/ride.entity';
import { Expose, Type } from 'class-transformer';

// --- Additional enum for per-passenger leg status (shared rides) ---
export enum RideLegStatus {
  WAITING_FOR_PICKUP = 'waiting_for_pickup',
  ON_BOARD = 'on_board',
  DROPPED_OFF = 'dropped_off',
}

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

// --- DTO for updating a single passenger's leg status in a shared ride ---
export class UpdateRideLegStatusDto {
  @ApiProperty({
    description: 'The ID of the ride whose leg status is being updated.',
    example: 'd6f9c7b4-3a2e-11ec-9bbc-0242ac130002',
  })
  @IsUUID()
  rideId: string;

  @ApiProperty({
    description: 'The ID of the passenger whose leg status is being updated.',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  @IsUUID()
  passengerId: string;

  @ApiProperty({
    description: 'The new status for this passenger within the shared ride.',
    enum: RideLegStatus,
    example: RideLegStatus.ON_BOARD,
  })
  @IsEnum(RideLegStatus)
  status: RideLegStatus;
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
}
