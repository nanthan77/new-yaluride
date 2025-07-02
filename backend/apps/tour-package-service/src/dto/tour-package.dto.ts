import { IsNotEmpty, IsString, IsNumber, IsOptional, IsArray, IsUUID, IsIn, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateTourPackageDto {
  @ApiProperty({ description: 'Package title' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'Package description' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ description: 'Price per person' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Maximum number of travelers' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(50)
  max_travelers: number;

  @ApiProperty({ description: 'Duration in days' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  duration_days: number;

  @ApiProperty({ description: 'Starting location' })
  @IsNotEmpty()
  @IsString()
  starting_location: string;

  @ApiProperty({ description: 'Package highlights', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  highlights?: string[];
}

export class UpdateTourPackageDto {
  @ApiProperty({ description: 'Package title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Package description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Price per person' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({ description: 'Maximum number of travelers' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  max_travelers?: number;

  @ApiProperty({ description: 'Duration in days' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  duration_days?: number;

  @ApiProperty({ description: 'Starting location' })
  @IsOptional()
  @IsString()
  starting_location?: string;

  @ApiProperty({ description: 'Package highlights', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  highlights?: string[];
}

export class CreateTourBookingDto {
  @ApiProperty({ description: 'Tour package ID' })
  @IsNotEmpty()
  @IsUUID()
  package_id: string;

  @ApiProperty({ description: 'Tour package ID (alternative name)' })
  @IsNotEmpty()
  @IsUUID()
  tourPackageId: string;

  @ApiProperty({ description: 'Number of travelers' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  travelers_count: number;

  @ApiProperty({ description: 'Preferred start date' })
  @IsNotEmpty()
  @IsString()
  preferred_date: string;

  @ApiProperty({ description: 'Special requests' })
  @IsOptional()
  @IsString()
  special_requests?: string;
}

export class RespondToBookingDto {
  @ApiProperty({ description: 'Response to booking', enum: ['accepted', 'rejected'] })
  @IsNotEmpty()
  @IsIn(['accepted', 'rejected'])
  response: 'accepted' | 'rejected';

  @ApiProperty({ description: 'Booking response status' })
  @IsNotEmpty()
  @IsString()
  status: string;

  @ApiProperty({ description: 'Message to passenger' })
  @IsOptional()
  @IsString()
  message?: string;
}

export class ItineraryItemDto {
  @ApiProperty({ description: 'Day number' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  day: number;

  @ApiProperty({ description: 'Activity title' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'Activity description' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ description: 'Location' })
  @IsNotEmpty()
  @IsString()
  location: string;

  @ApiProperty({ description: 'Start time' })
  @IsOptional()
  @IsString()
  start_time?: string;

  @ApiProperty({ description: 'End time' })
  @IsOptional()
  @IsString()
  end_time?: string;
}

export class TourPackageDto {
  @ApiProperty({ description: 'Tour package ID' })
  id: string;

  @ApiProperty({ description: 'Tour package name' })
  title: string;

  @ApiProperty({ description: 'Tour package description' })
  description: string;

  @ApiProperty({ description: 'Tour package price' })
  price: number;
}

export class TourBookingDto {
  @ApiProperty({ description: 'Booking ID' })
  id: string;

  @ApiProperty({ description: 'Tour package ID' })
  packageId: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Booking status' })
  status: string;
}
