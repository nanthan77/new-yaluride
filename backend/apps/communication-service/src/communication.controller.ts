import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
  UsePipes,
  Logger,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';

import { CommunicationService } from './communication.service';
import { JwtAuthGuard } from '@yaluride/auth';
import { UserDecorator } from '@yaluride/common';
import { User } from '@yaluride/database';
import {
  GetCannedResponsesQueryDto,
  MessageDto,
  CannedResponseDto,
} from './core/dto/communication.dto';
import { UserRole } from '@yaluride/common';


@ApiTags('Communication & Chat')
@Controller('communication')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class CommunicationController {
  private readonly logger = new Logger(CommunicationController.name);

  constructor(private readonly communicationService: CommunicationService) {}

  @Get('history/:rideId')
  @ApiOperation({
    summary: "Get Chat History for a Ride",
    description: "Retrieves the full message history for a specific ride. The user must be either the passenger or the driver of the ride.",
  })
  @ApiParam({ name: 'rideId', description: 'The UUID of the ride.', type: 'string' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved chat history.', type: [MessageDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized - User is not logged in.' })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not a participant in this ride.' })
  @ApiResponse({ status: 404, description: 'Not Found - The specified ride does not exist.' })
  async getChatHistory(
    @Param('rideId', ParseUUIDPipe) rideId: string,
    @UserDecorator() user: User,
  ): Promise<MessageDto[]> {
    this.logger.log(`User ${user.id} requesting chat history for ride ${rideId}`);
    // The service layer will throw a ForbiddenException if the user is not part of the ride.
    const messages = await this.communicationService.getChatHistory(rideId, user.id);
    return messages.map(msg => new MessageDto(msg));
  }

  @Get('canned-responses')
  @ApiOperation({
    summary: 'Get Canned (Pre-defined) Responses',
    description: 'Fetches a list of pre-defined, translated chat messages for quick replies, based on the user\'s role and selected language.',
  })
  @ApiQuery({ name: 'language', enum: ['en', 'si', 'ta'], description: 'The language for the responses.' })
  @ApiQuery({ name: 'userType', enum: ['passenger', 'driver'], description: 'The role to get responses for.' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved canned responses.', type: [CannedResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid query parameters.' })
  async getCannedResponses(
    @Query() queryDto: GetCannedResponsesQueryDto,
    @UserDecorator() user: User,
  ): Promise<CannedResponseDto[]> {
    const { language, userType } = queryDto;

    // Ensure the requested userType matches the user's role for security.
    // A user should not be able to request canned responses for a role they do not have.
    if (user.role !== UserRole.ADMIN && user.role !== 'both' && user.role !== userType) {
        throw new ForbiddenException(`You do not have permission to view canned responses for the role: ${userType}`);
    }

    this.logger.log(`Fetching canned responses for role: ${userType}, language: ${language}`);
    const responses = await this.communicationService.getCannedResponses(userType, language);
    return responses.map(res => new CannedResponseDto(res));
  }
}
