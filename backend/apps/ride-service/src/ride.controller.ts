import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  UseGuards,
  Logger,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  BadRequestException,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

import { ConfigService } from '@nestjs/config';
import { RideService } from './ride.service';
import { JwtAuthGuard } from '../../../../libs/auth/src/guards/jwt-auth.guard';
import { User as UserDecorator } from '../../../../libs/common/src/decorators/user.decorator';
import { User } from '../../../../libs/common/src/types/user.type';
import {
  CreateRideRequestDto,
  UpdateRideStatusDto,
  RateRideDto,
  RideResponseDto,
  UpdateRideLegStatusDto,
} from './dto/ride.dto';
import { Ride } from './entities/ride.entity';

@ApiTags('Rides')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller('rides')
export class RideController {
  private readonly logger = new Logger(RideController.name);

  constructor(private readonly rideService: RideService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new ride request' })
  @ApiBody({ type: CreateRideRequestDto })
  @ApiResponse({
    status: 201,
    description: 'Ride request successfully created and is now searching for drivers.',
    type: RideResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input data or user has an ongoing ride.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async createRideRequest(
    @Body() createRideDto: CreateRideRequestDto,
    @UserDecorator() passenger: User,
  ): Promise<RideResponseDto> {
    this.logger.log(`Received ride request from passenger: ${passenger.id}`);
    const ride = await this.rideService.createRideRequest(createRideDto, passenger);
    return new RideResponseDto(ride);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details for a specific ride' })
  @ApiParam({ name: 'id', description: 'The UUID of the ride.', type: 'string' })
  @ApiResponse({ status: 200, description: 'Ride details retrieved successfully.', type: RideResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not part of this ride.' })
  @ApiResponse({ status: 404, description: 'Not Found - Ride with the specified ID not found.' })
  async getRideById(
    @Param('id', ParseUUIDPipe) rideId: string,
    @UserDecorator() user: User,
  ): Promise<RideResponseDto> {
    const ride = await this.rideService.findRideByIdForUser(rideId, user.id);
    return new RideResponseDto(ride);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update the status of a ride' })
  @ApiParam({ name: 'id', description: 'The UUID of the ride.', type: 'string' })
  @ApiBody({ type: UpdateRideStatusDto })
  @ApiResponse({ status: 200, description: 'Ride status updated successfully.', type: RideResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid status transition.' })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not authorized to perform this status update.' })
  async updateRideStatus(
    @Param('id', ParseUUIDPipe) rideId: string,
    @UserDecorator() user: User,
    @Body() updateRideStatusDto: UpdateRideStatusDto,
  ): Promise<RideResponseDto> {
    const { status, ...payload } = updateRideStatusDto;
    let updatedRide: Ride;

    // The service layer will contain the complex logic to validate if a user
    // can perform a specific status change.
    switch (status) {
      case 'CANCELLED_BY_PASSENGER':
        if (user.id !== (await this.rideService.findRideById(rideId)).passenger_id) {
          throw new ForbiddenException('Only the passenger can cancel the ride.');
        }
        updatedRide = await this.rideService.cancelTrip(rideId, user.id, payload.cancellationReason);
        break;
      case 'CANCELLED_BY_DRIVER':
         if (user.id !== (await this.rideService.findRideById(rideId)).driver_id) {
          throw new ForbiddenException('Only the driver can cancel the ride.');
        }
        updatedRide = await this.rideService.cancelTrip(rideId, user.id, payload.cancellationReason);
        break;
      case 'DRIVER_ARRIVED':
         if (user.id !== (await this.rideService.findRideById(rideId)).driver_id) {
          throw new ForbiddenException('Only the driver can mark themselves as arrived.');
        }
        updatedRide = await this.rideService.driverArrived(rideId, user.id);
        break;
      case 'ONGOING':
        if (user.id !== (await this.rideService.findRideById(rideId)).driver_id) {
          throw new ForbiddenException('Only the driver can start the trip.');
        }
        updatedRide = await this.rideService.startTrip(rideId, user.id);
        break;
      case 'COMPLETED':
         if (user.id !== (await this.rideService.findRideById(rideId)).driver_id) {
          throw new ForbiddenException('Only the driver can end the trip.');
        }
        if (!payload.finalFare || !payload.distanceMeters) {
            throw new BadRequestException('Final fare and distance are required to complete a ride.');
        }
        updatedRide = await this.rideService.endTrip(rideId, user.id, { actualFare: payload.finalFare, distanceMeters: payload.distanceMeters });
        break;
      default:
        throw new BadRequestException(`Status update to '${status}' is not supported via this endpoint.`);
    }

    return new RideResponseDto(updatedRide);
  }

  @Post(':id/rate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a rating and review for a completed ride' })
  @ApiParam({ name: 'id', description: 'The UUID of the ride.', type: 'string' })
  @ApiBody({ type: RateRideDto })
  @ApiResponse({ status: 201, description: 'Review submitted successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request - Ride not completed or already rated.' })
  @ApiResponse({ status: 403, description: 'Forbidden - User was not part of this ride.' })
  async rateRide(
    @Param('id', ParseUUIDPipe) rideId: string,
    @UserDecorator() user: User,
    @Body() rateRideDto: RateRideDto,
  ): Promise<{ message: string; ratingId: string }> {
    const rating = await this.rideService.rateRide(rideId, user, rateRideDto);
    return {
      message: 'Review submitted successfully.',
      ratingId: rating.id,
    };
  }

  /* ------------------------------------------------------------------
   *  Shared Ride – per-passenger leg status updates
   * ----------------------------------------------------------------- */

  @Patch('legs/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Driver updates the status of an individual passenger leg in a shared ride',
    description:
      'Allows the assigned driver to update a single passenger’s leg status (waiting, on-board, dropped-off). ' +
      'Automatically triggers overall ride status recalculation.',
  })
  @ApiBody({ type: UpdateRideLegStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Passenger leg status updated successfully.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden – Only the driver of the ride can update leg statuses.',
  })
  async updateLegStatus(
    @Body() dto: UpdateRideLegStatusDto,
    @UserDecorator() user: User,
  ): Promise<{ message: string }> {
    // Ensure the requesting user is the driver of this ride
    const ride = await this.rideService.findRideById(dto.rideId);
    if (!ride || ride.driver_id !== user.id) {
      throw new ForbiddenException('Only the assigned driver can update passenger leg status for this ride.');
    }

    await this.rideService.updatePassengerLegStatus(dto);
    return { message: 'Passenger leg status updated.' };
  }

  /* ------------------------------------------------------------------
   *  Share Trip Status – generate a short-lived public link
   * ----------------------------------------------------------------- */

  @Post(':id/share')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generate a secure, time-limited link to share live trip status',
    description:
      'Returns a JWT token and a public URL that allows temporary, read-only access to the ride’s real-time location data. ' +
      'Caller must be the driver or a passenger of the ride.',
  })
  @ApiParam({ name: 'id', description: 'The UUID of the ride to share.', type: 'string' })
  @ApiResponse({
    status: 201,
    description: 'Share link generated successfully.',
    schema: {
      example: {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…',
        shareUrl: 'https://app.gamango.lk/share/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…',
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden – Caller is not a participant in the ride.' })
  async shareTrip(
    @Param('id', ParseUUIDPipe) rideId: string,
    @UserDecorator() user: User,
  ): Promise<{ token: string; shareUrl: string }> {
    // Generate JWT token via service (validity handled there)
    const token = await this.rideService.generateTripShareToken(rideId, user.id);

    // Build a public-facing URL using an environment variable or fallback
    const baseUrl =
      process.env.PUBLIC_SHARE_BASE_URL?.replace(/\/+$/, '') ||
      'https://app.gamango.lk/share';
    const shareUrl = `${baseUrl}/${token}`;

    return { token, shareUrl };
  }
}
