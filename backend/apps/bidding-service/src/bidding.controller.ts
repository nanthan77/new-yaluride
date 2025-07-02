import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Logger,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  ForbiddenException,
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

import { BiddingService } from './bidding.service';
import { JwtAuthGuard } from '@yaluride/auth';
import { UserDecorator, User, UserRole } from '@yaluride/common';
import { NotFoundException } from '@nestjs/common';
import { CreateBidDto, BidResponseDto, BidSuggestionResponseDto } from './core/dto/bid.dto';
import { RideResponseDto } from '../../ride-service/src/dto/ride.dto'; // Assuming shared DTO location

@ApiTags('Bidding')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller() // Base path will be determined by the API Gateway routing
export class BiddingController {
  private readonly logger = new Logger(BiddingController.name);

  constructor(private readonly biddingService: BiddingService) {}

  @Post('bids')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit a new bid for a journey',
    description: 'Allows an authenticated driver to place a bid on an open journey request.',
  })
  @ApiBody({ type: CreateBidDto })
  @ApiResponse({ status: 201, description: 'Bid submitted successfully.', type: BidResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request - Journey not open for bidding or invalid data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only drivers can place bids.' })
  async createBid(
    @Body() createBidDto: CreateBidDto,
    @UserDecorator() driver: User,
  ): Promise<BidResponseDto> {
    this.logger.log(`Driver ${driver.id} is placing a bid on journey ${createBidDto.journeyId}`);

    if (driver.role !== UserRole.DRIVER && driver.role !== UserRole.BOTH) {
      throw new ForbiddenException('Only users with a driver role can place bids.');
    }

    const bid = await this.biddingService.createBid(createBidDto, driver.id);
    return new BidResponseDto(bid);
  }

  @Get('journeys/:journeyId/bids')
  @ApiOperation({
    summary: 'Get all bids for a specific journey',
    description: 'Retrieves all bids submitted for a given journey. Only the passenger who posted the journey can view the bids.',
  })
  @ApiParam({ name: 'journeyId', description: 'The UUID of the journey.', type: 'string' })
  @ApiResponse({ status: 200, description: 'A list of bids for the journey.', type: [BidResponseDto] })
  @ApiResponse({ status: 403, description: 'Forbidden - You are not the owner of this journey.' })
  @ApiResponse({ status: 404, description: 'Journey not found.' })
  async getBidsForJourney(
    @Param('journeyId', ParseUUIDPipe) journeyId: string,
    @UserDecorator() user: User,
  ): Promise<BidResponseDto[]> {
    this.logger.log(`User ${user.id} is fetching bids for journey ${journeyId}`);
    const bids = await this.biddingService.getBidsForJourney(journeyId, user.id);
    return bids.map(bid => new BidResponseDto(bid));
  }

  @Post('bids/:id/accept')
  @ApiOperation({
    summary: 'Accept a bid',
    description: 'Allows a passenger to accept a driver\'s bid on their journey. This action creates a confirmed ride.',
  })
  @ApiParam({ name: 'id', description: 'The UUID of the bid to accept.', type: 'string' })
  @ApiResponse({ status: 201, description: 'Bid accepted and ride created successfully.', type: RideResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request - Bid cannot be accepted in its current state.' })
  @ApiResponse({ status: 403, description: 'Forbidden - You are not authorized to accept this bid.' })
  @ApiResponse({ status: 404, description: 'Bid not found.' })
  @HttpCode(HttpStatus.CREATED)
  async acceptBid(
    @Param('id', ParseUUIDPipe) bidId: string,
    @UserDecorator() passenger: User,
  ): Promise<RideResponseDto> {
    this.logger.log(`Passenger ${passenger.id} is accepting bid ${bidId}`);

    if (passenger.role !== UserRole.PASSENGER && passenger.role !== UserRole.BOTH) {
        throw new ForbiddenException('Only users with a passenger role can accept bids.');
    }

    const journey = await this.biddingService.acceptBid(bidId, passenger.id);
    const rideData = {
      id: journey.id,
      passengerId: journey.passenger_id,
      driverId: journey.driver_id,
      status: 'confirmed' as any, // Convert JourneyStatus to RideStatus
      pickupLocation: journey.pickup_location,
      dropoffLocation: journey.destination_latitude + ',' + journey.destination_longitude,
      fare: journey.agreed_fare,
      scheduledAt: journey.scheduled_time,
    };
    return new RideResponseDto(rideData);
  }

  @Get('journeys/:journeyId/suggestion')
  @ApiOperation({
    summary: 'Get AI-Powered Bid Suggestion',
    description: 'Provides a suggested bidding price for a journey based on historical data, demand, and other factors. Intended for passengers to gauge fair pricing.',
  })
  @ApiParam({ name: 'journeyId', description: 'The UUID of the journey to get a suggestion for.', type: 'string' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved bid suggestion.', type: BidSuggestionResponseDto })
  @ApiResponse({ status: 404, description: 'Journey not found.' })
  @ApiResponse({ status: 502, description: 'AI suggestion service is currently unavailable.' })
  async getBidSuggestion(
    @Param('journeyId', ParseUUIDPipe) journeyId: string,
    @UserDecorator() user: User, // Ensure user is authenticated, though any user can see suggestions
  ): Promise<BidSuggestionResponseDto> {
    this.logger.log(`User ${user.id} requesting bid suggestion for journey ${journeyId}`);
    const suggestion = await this.biddingService.getBidSuggestion(journeyId);
    if (!suggestion) throw new NotFoundException('Could not generate a suggestion for this journey.');
    return suggestion;
  }
}
