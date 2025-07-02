import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';

import { AlertService } from './alert.service';
import { JwtAuthGuard } from '../../../../libs/auth/src/guards/jwt-auth.guard'; // Adjust path
import { User as UserDecorator } from '../../../../libs/common/src/decorators/user.decorator'; // Adjust path
import { User } from '../../../../user/src/core/entities/user.entity'; // Adjust path
import {
  CreateRoadAlertDto,
  VoteOnAlertDto,
  RoadAlertResponseDto,
} from './core/dto/road-alert.dto';
import { GetNearbyAlertsDto } from './core/dto/get-nearby-alerts.dto';

@ApiTags('Community Alerts')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller('alerts')
export class AlertController {
  private readonly logger = new Logger(AlertController.name);

  constructor(private readonly alertService: AlertService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new road alert',
    description: 'Allows an authenticated user to report a new road alert. The user\'s karma and verification status may affect their ability to post certain types of alerts.',
  })
  @ApiResponse({ status: 201, description: 'The alert was successfully created.', type: RoadAlertResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - User is not authenticated.' })
  @ApiResponse({ status: 403, description: 'Forbidden - User does not have permission to post this type of alert.' })
  async createAlert(
    @Body() createAlertDto: CreateRoadAlertDto,
    @UserDecorator() user: User,
  ): Promise<RoadAlertResponseDto> {
    this.logger.log(`User ${user.id} is creating a new alert of type ${createAlertDto.alertType}`);
    const alert = await this.alertService.createAlert(createAlertDto, user);
    return new RoadAlertResponseDto(alert);
  }

  @Get('/nearby')
  @ApiOperation({
    summary: 'Get active alerts within a geographic radius',
    description: 'Fetches all active and verified road alerts within a specified radius from a central point.',
  })
  @ApiQuery({ name: 'latitude', type: Number, required: true, description: 'The latitude of the center point.' })
  @ApiQuery({ name: 'longitude', type: Number, required: true, description: 'The longitude of the center point.' })
  @ApiQuery({ name: 'radius_km', type: Number, required: true, description: 'The search radius in kilometers.' })
  @ApiResponse({ status: 200, description: 'A list of nearby alerts.', type: [RoadAlertResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getNearbyAlerts(
    @Query() queryParams: GetNearbyAlertsDto,
  ): Promise<RoadAlertResponseDto[]> {
    this.logger.log(`Fetching nearby alerts for location: ${queryParams.latitude}, ${queryParams.longitude}`);
    const alerts = await this.alertService.getActiveAlertsInRadius(queryParams);
    return alerts.map(alert => new RoadAlertResponseDto(alert));
  }

  @Post('/:id/vote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Vote on a road alert',
    description: 'Allows a user to confirm (upvote) or reject (downvote) an existing alert. This contributes to the alert\'s confidence score.',
  })
  @ApiParam({ name: 'id', description: 'The UUID of the alert to vote on.', type: 'string' })
  @ApiResponse({ status: 200, description: 'Vote successfully registered.', type: RoadAlertResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request - User has already voted or the alert is not active.' })
  @ApiResponse({ status: 403, description: 'Forbidden - User cannot vote on their own alert.' })
  @ApiResponse({ status: 404, description: 'Not Found - The specified alert does not exist.' })
  async voteOnAlert(
    @Param('id', ParseUUIDPipe) alertId: string,
    @Body() voteDto: VoteOnAlertDto,
    @UserDecorator() user: User,
  ): Promise<RoadAlertResponseDto> {
    this.logger.log(`User ${user.id} is voting (${voteDto.vote}) on alert ${alertId}`);
    const updatedAlert = await this.alertService.addVoteToAlert(alertId, voteDto, user);
    return new RoadAlertResponseDto(updatedAlert);
  }

  @Get('/:id')
  @ApiOperation({ summary: 'Get a single alert by its ID' })
  @ApiParam({ name: 'id', description: 'The UUID of the alert.', type: 'string' })
  @ApiResponse({ status: 200, description: 'The details of the alert.', type: RoadAlertResponseDto })
  @ApiResponse({ status: 404, description: 'Not Found - The specified alert does not exist.' })
  async getAlertById(
    @Param('id', ParseUUIDPipe) alertId: string,
  ): Promise<RoadAlertResponseDto> {
    const alert = await this.alertService.getAlertById(alertId);
    return new RoadAlertResponseDto(alert);
  }
}
