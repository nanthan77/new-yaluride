import {
  Controller,
  Post,
  Body,
  UseGuards,
  Logger,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiProperty,
} from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsEnum, IsOptional, Min, Max } from 'class-validator';
import { Expose, Type } from 'class-transformer';

import { MatchingService } from './matching.service';
import { JwtAuthGuard } from '@yaluride/auth';
import { UserDecorator } from '@yaluride/common';
import { User } from '@yaluride/database';
import { VehicleType } from '@yaluride/common';

// --- DTOs (Data Transfer Objects) ---

export class FindDriversDto {
  @ApiProperty({
    description: "Passenger's current latitude.",
    example: 6.9271,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    description: "Passenger's current longitude.",
    example: 79.8612,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({
    description: 'Search radius in kilometers.',
    example: 5,
    required: false,
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  radiusKm?: number = 5;

  @ApiProperty({
    description: 'The type of vehicle requested by the passenger.',
    enum: VehicleType,
    example: VehicleType.CAR,
  })
  @IsNotEmpty()
  @IsEnum(VehicleType)
  vehicleType: VehicleType;
}

export class DriverResultDto {
  @ApiProperty({ example: 'driver-uuid-123' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'Ravi Perera' })
  @Expose()
  name: string;

  @ApiProperty({ example: 4.8 })
  @Expose()
  @Type(() => Number)
  avgRating: number;

  @ApiProperty({ example: { type: 'car', model: 'Toyota Aqua' } })
  @Expose()
  vehicle: any; // Simplified for this example

  @ApiProperty({ example: { latitude: 6.9271, longitude: 79.8612 } })
  @Expose()
  location: { latitude: number; longitude: number };

  @ApiProperty({ example: 1.2, description: 'Distance from passenger in km' })
  @Expose()
  @Type(() => Number)
  distanceKm: number;

  @ApiProperty({ example: 5, description: 'Estimated time of arrival in minutes' })
  @Expose()
  @Type(() => Number)
  etaMinutes: number;

  constructor(partial: Partial<DriverResultDto>) {
    Object.assign(this, partial);
  }
}


// --- Controller ---

@ApiTags('Matching Service')
@Controller('match')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class MatchingController {
  private readonly logger = new Logger(MatchingController.name);

  constructor(private readonly matchingService: MatchingService) {}

  @Post('find-drivers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Find Available Drivers',
    description: 'Finds available drivers near a passenger based on location and vehicle type. This is the core of the ride-hailing matching logic.',
  })
  @ApiBody({ type: FindDriversDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully found nearby drivers.',
    type: [DriverResultDto],
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async findAvailableDrivers(
    @Body() findDriversDto: FindDriversDto,
    @UserDecorator() user: User,
  ): Promise<DriverResultDto[]> {
    this.logger.log(
      `Passenger ${user.id} is finding drivers for type '${findDriversDto.vehicleType}' near (${findDriversDto.latitude}, ${findDriversDto.longitude})`,
    );

    const drivers = await this.matchingService.findAvailableDrivers(findDriversDto);

    // Map the raw driver data to a public-facing DTO to control exposed information
    return drivers.map(
      (driver) =>
        new DriverResultDto({
          id: driver.id,
          name: driver.name,
          avgRating: driver.avgRating,
          vehicle: driver.vehicle,
          location: driver.location,
          distanceKm: driver.distanceKm,
          etaMinutes: Math.ceil(driver.distanceKm * 1.5), // Simple ETA calculation
        }),
    );
  }
}
