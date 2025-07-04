import {
  Injectable,
  Logger,
  Inject,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
// import { GamificationEvent, GamificationEventType, PointReason } from '@yaluride/common';
import { Badge, UserBadge, PointsLog, Profile } from '@yaluride/database';
import { Ride } from '@yaluride/database';
import { LeaderboardEntryDto } from './dto/leaderboard-entry.dto';
import { UserBadgeDto } from './dto/user-badge.dto';
import { BadgeDto } from './dto/badge.dto';

// Define badge criteria in a structured way
interface BadgeCriterion {
  code: string;
  points: number;
  check: (profile: Profile, rideRepo: Repository<Ride>) => Promise<boolean>;
}

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);
  private readonly badgeCriteria: BadgeCriterion[];

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Badge)
    private readonly badgeRepository: Repository<Badge>,
    @InjectRepository(UserBadge)
    private readonly userBadgeRepository: Repository<UserBadge>,
    @InjectRepository(PointsLog)
    private readonly pointsLogRepository: Repository<PointsLog>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(Ride)
    private readonly rideRepository: Repository<Ride>,
    @Inject('GAMIFICATION_EVENTS_SERVICE')
    private readonly eventsClient: ClientProxy,
  ) {
    // Initialize badge criteria. This makes it easy to add new badges.
    this.badgeCriteria = [
      { code: 'FIRST_RIDE', points: 50, check: this.checkFirstRide },
      { code: 'ROAD_WARRIOR_10', points: 100, check: (p, r) => this.checkRideCount(p, r, 10) },
      { code: 'CITY_EXPLORER_50', points: 500, check: (p, r) => this.checkRideCount(p, r, 50) },
      { code: 'PERFECTIONIST', points: 75, check: this.checkFirstFiveStarRating },
      // Add more badge criteria here
    ];
  }

  /**
   * Main entry point for processing events from other microservices.
   * @param event - The gamification event payload.
   */
  async processEvent(event: any): Promise<void> {
    const { type, payload } = event;
    this.logger.log(`Processing event type: ${type} for user: ${payload.userId}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const profileRepo = queryRunner.manager.getRepository(Profile);
      const userProfile = await profileRepo.findOneBy({ id: payload.userId });
      if (!userProfile) {
        throw new NotFoundException(`Profile not found for user ID: ${payload.userId}`);
      }

      switch (type) {
        case 'ride_completed':
          await this._handleRideCompleted(userProfile, payload, queryRunner.manager);
          break;
        case 'rating_given':
          await this._handleRatingGiven(userProfile, payload, queryRunner.manager);
          break;
        // Add cases for other events like REFERRAL_COMPLETED, PROFILE_COMPLETED etc.
        default:
          this.logger.warn(`Unhandled gamification event type: ${type}`);
      }

      // After processing the event, check for any new badges the user might have earned.
      await this._checkAndAwardBadges(userProfile, queryRunner.manager);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to process event ${type} for user ${payload.userId}. Error: ${error.message}`, error.stack);
      // Depending on the error, you might want to re-throw or handle it gracefully.
      // For now, we log and absorb to prevent the service from crashing on a single bad event.
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Handles logic for when a ride is completed.
   */
  private async _handleRideCompleted(profile: Profile, payload: any, manager: any): Promise<void> {
    const rideFare = payload.fare || 0;
    // Award points for completing a ride, e.g., 1 point per 10 LKR.
    const pointsFromRide = Math.floor(rideFare / 10);
    if (pointsFromRide > 0) {
      await this._addPoints(profile, pointsFromRide, 'ride_completed', manager, { rideId: payload.rideId });
    }
  }

  /**
   * Handles logic for when a rating is given.
   */
  private async _handleRatingGiven(profile: Profile, payload: any, manager: any): Promise<void> {
    const rating = payload.rating || 0;
    if (rating === 5) {
      // Award bonus points for a 5-star rating.
      await this._addPoints(profile, 20, 'five_star_rating', manager, { rideId: payload.rideId });
    }
  }

  /**
   * Checks all defined badge criteria for a user and awards any new badges.
   */
  private async _checkAndAwardBadges(profile: Profile, manager: any): Promise<void> {
    const badgeRepo = manager.getRepository(Badge);
    const userBadgeRepo = manager.getRepository(UserBadge);
    const rideRepo = manager.getRepository(Ride);

    const allBadges = await badgeRepo.find();
    const earnedBadgeCodes = (await userBadgeRepo.find({ where: { user_id: profile.id } })).map(ub => ub.badge_code);

    const unearnedBadges = allBadges.filter(b => !earnedBadgeCodes.includes(b.code));

    for (const badge of unearnedBadges) {
      const criterion = this.badgeCriteria.find(c => c.code === badge.code);
      if (criterion) {
        const isEligible = await criterion.check(profile, rideRepo);
        if (isEligible) {
          await this._awardBadge(profile, badge, manager);
        }
      }
    }
  }

  /**
   * Awards a specific badge and its associated points to a user.
   */
  private async _awardBadge(profile: Profile, badge: Badge, manager: any): Promise<void> {
    this.logger.log(`Awarding badge "${badge.name}" to user ${profile.id}`);
    const userBadgeRepo = manager.getRepository(UserBadge);

    const newUserBadge = userBadgeRepo.create({
      user_id: profile.id,
      badge_id: badge.id,
      badge_code: badge.name,
    });
    await userBadgeRepo.save(newUserBadge);

    // Award points for the badge
    const badgePoints = 50; // Default badge reward points
    await this._addPoints(profile, badgePoints, 'badge_awarded', manager, { badgeId: badge.id });

    // Emit an event to notify the user
    this.eventsClient.emit('gamification.badge.unlocked', {
      userId: profile.id,
      badgeName: badge.name,
      badgeIconUrl: badge.iconUrl,
      pointsAwarded: 50, // Fixed badge reward points
    });
  }

  /**
   * Adds points to a user's profile and logs the transaction.
   */
  private async _addPoints(profile: Profile, points: number, reason: string, manager: any, metadata: any = {}): Promise<void> {
    const profileRepo = manager.getRepository(Profile);
    const pointsLogRepo = manager.getRepository(PointsLog);

    const pointsLogEntry = pointsLogRepo.create({
      user_id: profile.id,
      points_change: points,
      reason,
      metadata,
    });
    await pointsLogRepo.save(pointsLogEntry);

    // Update the user's total points balance
    await profileRepo.increment({ id: profile.id }, 'points_balance', points);
    
    this.logger.log(`Awarded ${points} points to user ${profile.id} for: ${reason}`);
  }

  // --- Badge Criteria Checkers ---

  private async checkFirstRide(profile: Profile, rideRepo: Repository<Ride>): Promise<boolean> {
    const rideCount = await rideRepo.count({ where: { passengerId: profile.id, status: 'completed' as any } });
    return rideCount >= 1;
  }

  private async checkRideCount(profile: Profile, rideRepo: Repository<Ride>, count: number): Promise<boolean> {
    const rideCount = await rideRepo.count({ where: { passengerId: profile.id, status: 'completed' as any } });
    return rideCount >= count;
  }
  
  private async checkFirstFiveStarRating(profile: Profile, rideRepo: Repository<Ride>): Promise<boolean> {
    return true;
  }


  // --- Public API Methods (for the controller) ---

  async getAllBadges(): Promise<BadgeDto[]> {
    const badges = await this.badgeRepository.find();
    return badges.map(b => Object.assign(new BadgeDto(), b));
  }

  async getBadgesForUser(userId: string): Promise<UserBadgeDto[]> {
    const userBadges = await this.userBadgeRepository.find({
      where: { userId: userId },
      relations: ['badge'],
      order: { earnedAt: 'DESC' },
    });
    return userBadges.map(ub => Object.assign(new UserBadgeDto(), ub));
  }

  async getLeaderboard(page: number = 1, limit: number = 20): Promise<LeaderboardEntryDto[]> {
    const offset = (page - 1) * limit;
    const users = await this.profileRepository.find({
      select: ['id', 'userId'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return users.map((user, index) => ({
      userId: user.userId,
      displayName: `User ${user.userId.substring(0, 8)}`, // Placeholder display name
      totalPoints: 0, // Placeholder points - would need separate points tracking
      rank: offset + index + 1,
    }));
  }
}
