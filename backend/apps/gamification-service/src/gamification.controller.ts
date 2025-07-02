import {
  Controller,
  Logger,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { GamificationService } from './gamification.service';
// import { GamificationEvent } from './interfaces/gamification-event.interface';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@yaluride/auth';
import { UserDecorator } from '@yaluride/common';
import { LeaderboardEntryDto } from './dto/leaderboard-entry.dto';
import { UserBadgeDto } from './dto/user-badge.dto';
import { BadgeDto } from './dto/badge.dto';
import { PaginationQueryDto } from '@yaluride/common';

@ApiTags('Gamification')
@Controller('gamification')
export class GamificationController {
  private readonly logger = new Logger(GamificationController.name);

  constructor(private readonly gamificationService: GamificationService) {}

  /**
   * Handles various gamification-related events from other microservices.
   * This single endpoint listens to a generic topic and delegates processing
   * based on the event type within the payload. This is a scalable pattern
   * that avoids creating a new listener for every new event type.
   *
   * @param event - The event payload containing the type and relevant data.
   */
  @EventPattern('gamification_event') // Listens to a single, unified topic for all gamification events
  async handleGamificationEvent(@Payload() event: any) {
    this.logger.log(
      `Received gamification event: ${event.type} for user ${event.payload.userId}`,
    );
    try {
      // Delegate the entire event object to the service for processing.
      await this.gamificationService.processEvent(event);
    } catch (error) {
      this.logger.error(
        `Error processing gamification event for user ${event.payload.userId}. Event type: ${event.type}`,
        error.stack,
      );
      // In a production system with a message broker like RabbitMQ, you might want to
      // decide whether to requeue the message or send it to a dead-letter queue (DLQ)
      // based on the type of error. For now, we log the error and let the message be
      // acknowledged to prevent infinite retries on unrecoverable errors.
    }
  }

  // ------------------------------------------------------------------
  // PUBLIC HTTP ENDPOINTS
  // ------------------------------------------------------------------

  /**
   * Get the global leaderboard (paginated).
   */
  @Get('leaderboard')
  @ApiOperation({ summary: 'Get global leaderboard' })
  @ApiResponse({
    status: 200,
    description: 'Array of leaderboard entries',
    type: [LeaderboardEntryDto],
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getLeaderboard(
    @Query() { page, limit }: PaginationQueryDto,
  ): Promise<LeaderboardEntryDto[]> {
    return this.gamificationService.getLeaderboard(page, limit);
  }

  /**
   * Get all possible badges available in the system.
   */
  @Get('badges')
  @ApiOperation({ summary: 'Get all badges' })
  @ApiResponse({
    status: 200,
    description: 'Array of badge definitions',
    type: [BadgeDto],
  })
  async getAllBadges(): Promise<BadgeDto[]> {
    return this.gamificationService.getAllBadges();
  }

  /**
   * Get badges earned by the currently authenticated user.
   */
  @Get('my-badges')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get badges for current user' })
  @ApiResponse({
    status: 200,
    description: 'Array of user badge records',
    type: [UserBadgeDto],
  })
  async getBadgesForUser(
    @UserDecorator('id') userId: string,
  ): Promise<UserBadgeDto[]> {
    return this.gamificationService.getBadgesForUser(userId);
  }
}
