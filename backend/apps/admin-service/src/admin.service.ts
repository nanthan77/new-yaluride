import {
  Injectable,
  Logger,
  Inject,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';

// Assuming entities and enums are in a shared library
import { User, Ride, Company, CompanyEmployee } from '@yaluride/database';
import { TravelPolicy } from '../../../../libs/database/src/entities/travel-policy.entity';
import { UserRole, ModerationStatus } from '../../../../libs/common/src/enums/user.enums';
import { ApproveVerificationDto, RejectVerificationDto } from './dto/admin.dto';

// Simple pagination response DTO
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Ride)
    private readonly rideRepository: Repository<Ride>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(CompanyEmployee)
    private readonly companyEmployeeRepository: Repository<CompanyEmployee>,
    @InjectRepository(TravelPolicy)
    private readonly travelPolicyRepository: Repository<TravelPolicy>,
    @Inject('ADMIN_EVENTS_SERVICE')
    private readonly eventsClient: ClientProxy,
  ) {}

  /**
   * Fetches all user profiles that have a pending verification request.
   * This includes pending GN verification, driver license, or vehicle verification.
   * @returns A list of user profiles awaiting verification.
   */
  async getPendingVerifications(): Promise<User[]> {
    this.logger.log('Fetching all pending driver and document verifications.');
    try {
      const pendingUsers = await this.userRepository.find({
        where: {
          role: In([UserRole.DRIVER, UserRole.BOTH]),
          // Find users where at least one of the verification statuses is 'pending'
          gn_verified_status: ModerationStatus.PENDING,
          // The OR condition below is commented out as it's not supported directly in TypeORM's find options in this manner.
          // A QueryBuilder would be needed for a complex OR across multiple columns.
          // For simplicity, we'll start by fetching pending GN verifications.
          // To fetch all, a more complex query is needed.
          // Example with QueryBuilder:
          // return this.userRepository.createQueryBuilder("user")
          //   .where("user.role IN (:...roles)", { roles: [UserRole.DRIVER, UserRole.BOTH] })
          //   .andWhere(new Brackets(qb => {
          //       qb.where("user.gn_verified_status = :status", { status: ModerationStatus.PENDING })
          //         .orWhere("user.driver_license_verified_status = :status", { status: ModerationStatus.PENDING })
          //         .orWhere("user.vehicle_verified_status = :status", { status: ModerationStatus.PENDING })
          //   }))
          //   .getMany();
        },
        select: [ // Select only necessary fields for the admin dashboard view
          'id',
          'display_name',
          'phone_number',
          'gn_division_id',
          'gn_verified_status',
          'driver_license_verified_status',
          'vehicle_verified_status',
          'gn_verification_documents',
          'driver_license_documents',
          'vehicle_verification_documents',
          'created_at',
        ],
      });
      return pendingUsers;
    } catch (error) {
      this.logger.error('Failed to fetch pending verifications.', error.stack);
      throw new InternalServerErrorException('An error occurred while fetching pending verifications.');
    }
  }

  /**
   * Approves a specific type of verification for a user.
   * @param approveDto - Contains the userId and the type of verification to approve.
   * @returns The updated user profile.
   */
  async approveVerification(approveDto: ApproveVerificationDto): Promise<User> {
    const { userId, verificationType } = approveDto;
    this.logger.log(`Attempting to approve '${verificationType}' verification for user ${userId}`);

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    const updatePayload: Partial<User> = {};
    let statusField: keyof User;

    switch (verificationType) {
      case 'gn':
        statusField = 'gn_verified_status';
        break;
      case 'license':
        statusField = 'driver_license_verified_status';
        break;
      case 'vehicle':
        statusField = 'vehicle_verified_status';
        break;
      default:
        throw new BadRequestException('Invalid verification type specified.');
    }

    if (user[statusField] !== ModerationStatus.PENDING) {
        throw new BadRequestException(`Verification for '${verificationType}' is not in a pending state.`);
    }

    updatePayload[statusField] = ModerationStatus.APPROVED;

    try {
      await this.userRepository.update(userId, updatePayload);
      const updatedUser = await this.userRepository.findOneBy({ id: userId });

      // Emit an event to notify the user
      this.eventsClient.emit('driver.verification.updated', {
        userId,
        type: verificationType,
        status: ModerationStatus.APPROVED,
        message: `Your ${verificationType} verification has been approved.`,
      });

      this.logger.log(`Successfully approved '${verificationType}' verification for user ${userId}`);
      return updatedUser;
    } catch (error) {
      this.logger.error(`Failed to approve verification for user ${userId}.`, error.stack);
      throw new InternalServerErrorException('Database update failed during verification approval.');
    }
  }

  /**
   * Rejects a specific type of verification for a user, providing a reason.
   * @param rejectDto - Contains the userId, verification type, and rejection reason.
   * @returns The updated user profile.
   */
  async rejectVerification(rejectDto: RejectVerificationDto): Promise<User> {
    const { userId, verificationType, reason } = rejectDto;
    this.logger.log(`Attempting to reject '${verificationType}' verification for user ${userId} with reason: ${reason}`);

    if (!reason || reason.trim().length === 0) {
        throw new BadRequestException('A reason is required for rejection.');
    }

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    const updatePayload: Partial<User> = {};
    let statusField: keyof User;
    // Assuming a JSONB field like 'moderation_notes' exists to store rejection reasons
    // For now, we'll just update the status. In a real app, you'd add the reason to the DB.
    // Example: user.moderation_notes = { ...user.moderation_notes, [`${verificationType}_rejection`]: reason };

    switch (verificationType) {
      case 'gn':
        statusField = 'gn_verified_status';
        break;
      case 'license':
        statusField = 'driver_license_verified_status';
        break;
      case 'vehicle':
        statusField = 'vehicle_verified_status';
        break;
      default:
        throw new BadRequestException('Invalid verification type specified.');
    }

    if (user[statusField] !== ModerationStatus.PENDING) {
        throw new BadRequestException(`Verification for '${verificationType}' is not in a pending state.`);
    }
    
    updatePayload[statusField] = ModerationStatus.REJECTED;
    // Here you would also update a field with the rejection reason, e.g.:
    // updatePayload.moderation_notes = { ...user.moderation_notes, [`${verificationType}_rejection`]: reason };

    try {
      await this.userRepository.update(userId, updatePayload);
      const updatedUser = await this.userRepository.findOneBy({ id: userId });

      // Emit an event to notify the user
      this.eventsClient.emit('driver.verification.updated', {
        userId,
        type: verificationType,
        status: ModerationStatus.REJECTED,
        message: `Your ${verificationType} verification was rejected. Reason: ${reason}`,
        reason: reason,
      });

      this.logger.log(`Successfully rejected '${verificationType}' verification for user ${userId}`);
      return updatedUser;
    } catch (error) {
      this.logger.error(`Failed to reject verification for user ${userId}.`, error.stack);
      throw new InternalServerErrorException('Database update failed during verification rejection.');
    }
  }

  // Other admin-specific methods can be added here, e.g.:
  // - getUserListWithFilters()
  // - banUser()
  // - getPlatformAnalytics()

  /* -----------------------------------------------------------------------
   * CORPORATE  PORTAL  METHODS
   * ---------------------------------------------------------------------*/

  /**
   * Fetch paginated corporate profiles with optional company name search.
   */
  async getCorporateProfiles(
    page = 1,
    limit = 20,
    search?: string,
  ): Promise<PaginatedResult<Company>> {
    try {
      const where = search
        ? { name: Like(`%${search}%`) }
        : {};

      const [data, total] = await this.companyRepository.findAndCount({
        where,
        take: limit,
        skip: (page - 1) * limit,
        order: { created_at: 'DESC' },
      });

      return { data, total, page, limit };
    } catch (error) {
      this.logger.error('Failed to fetch corporate profiles', error.stack);
      throw new InternalServerErrorException('Could not fetch corporate profiles');
    }
  }

  /**
   * Fetch detailed information for a single corporate profile including its
   * employees and travel policies.
   */
  async getCorporateProfileById(companyId: string): Promise<Company> {
    try {
      const company = await this.companyRepository.findOne({
        where: { id: companyId },
        relations: {
          employees: true,
          travelPolicies: true,
        } as any, // `as any` to satisfy TS if entities don't have proper relations typed
      });

      if (!company) {
        throw new NotFoundException(`Company with ID ${companyId} not found.`);
      }

      return company;
    } catch (error) {
      this.logger.error(`Failed to fetch corporate profile ${companyId}`, error.stack);
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Could not fetch corporate profile');
    }
  }

  /**
   * Approve a newly-created corporate profile (super-admin action)
   */
  async approveCorporateProfile(companyId: string): Promise<Company> {
    this.logger.log(`Approving corporate profile ${companyId}`);
    try {
      const company = await this.companyRepository.findOneBy({ id: companyId });
      if (!company) {
        throw new NotFoundException(`Company with ID ${companyId} not found.`);
      }

      if ((company as any).is_active === true) {
        throw new BadRequestException('Company is already approved.');
      }

      await this.companyRepository.update(companyId, { is_active: true } as any);
      const updated = await this.companyRepository.findOneBy({ id: companyId });

      // Emit event
      this.eventsClient.emit('corporate.profile.updated', {
        companyId,
        action: 'approved',
      });

      return updated;
    } catch (error) {
      this.logger.error(`Failed to approve corporate profile ${companyId}`, error.stack);
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Could not approve corporate profile');
    }
  }

  /**
   * Suspend (deactivate) a corporate profile.
   */
  async suspendCorporateProfile(companyId: string): Promise<Company> {
    this.logger.log(`Suspending corporate profile ${companyId}`);
    try {
      const company = await this.companyRepository.findOneBy({ id: companyId });
      if (!company) {
        throw new NotFoundException(`Company with ID ${companyId} not found.`);
      }

      if ((company as any).is_active === false) {
        throw new BadRequestException('Company is already suspended.');
      }

      await this.companyRepository.update(companyId, { is_active: false } as any);
      const updated = await this.companyRepository.findOneBy({ id: companyId });

      // Emit event
      this.eventsClient.emit('corporate.profile.updated', {
        companyId,
        action: 'suspended',
      });

      return updated;
    } catch (error) {
      this.logger.error(`Failed to suspend corporate profile ${companyId}`, error.stack);
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Could not suspend corporate profile');
    }
  }

  /* -----------------------------------------------------------------------
   * DASHBOARD / ADMIN SUMMARY
   * ---------------------------------------------------------------------*/

  export interface PlatformStats {
    totalUsers: number;
    activeRides: number;
    totalRevenue: number;
    pendingVerifications: number;
  }

  /**
   * Returns aggregated numbers for the admin dashboard
   */
  async getPlatformStats(): Promise<PlatformStats> {
    try {
      const [totalUsers, activeRides, { revenue }, pendingVerifs] = await Promise.all([
        this.userRepository.count(),
        this.rideRepository.count({ where: { status: In(['ONGOING', 'ACCEPTED']) } }),
        // using COALESCE … SUM for revenue
        this.rideRepository
          .createQueryBuilder('ride')
          .select('COALESCE(SUM(ride.final_fare),0)', 'revenue')
          .where('ride.status = :status', { status: 'COMPLETED' })
          .getRawOne<{ revenue: string }>(),
        this.userRepository.count({
          where: [
            { gn_verified_status: ModerationStatus.PENDING },
            { driver_license_verified_status: ModerationStatus.PENDING },
            { vehicle_verified_status: ModerationStatus.PENDING },
          ],
        }),
      ]);

      return {
        totalUsers,
        activeRides,
        totalRevenue: Number(revenue ?? 0),
        pendingVerifications: pendingVerifs,
      };
    } catch (error) {
      this.logger.error('Failed to fetch platform stats', error.stack);
      throw new InternalServerErrorException('Could not fetch platform statistics');
    }
  }

  /* -----------------------------------------------------------------------
   * USER MANAGEMENT
   * ---------------------------------------------------------------------*/

  interface FindUserParams {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }

  async findUsers(params: FindUserParams) {
    const { page = 1, limit = 20, search, role, status } = params;
    try {
      const qb = this.userRepository
        .createQueryBuilder('u')
        .orderBy('u.created_at', 'DESC')
        .take(limit)
        .skip((page - 1) * limit);

      if (search) {
        qb.andWhere(
          '(LOWER(u.display_name) ILIKE :search OR LOWER(u.email) ILIKE :search OR u.phone_number ILIKE :search)',
          { search: `%${search.toLowerCase()}%` },
        );
      }
      if (role) qb.andWhere('u.role = :role', { role });
      if (status) qb.andWhere('u.status = :status', { status });

      const [data, total] = await qb.getManyAndCount();
      return { data, total, page, limit };
    } catch (err) {
      this.logger.error('findUsers failed', err.stack);
      throw new InternalServerErrorException('Failed to query users');
    }
  }

  /* -----------------------------------------------------------------------
   * USER ADMIN ACTIONS
   * ---------------------------------------------------------------------*/

  async updateUserStatus(userId: string, newStatus: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.status === newStatus)
      throw new BadRequestException('User already has this status');

    await this.userRepository.update(userId, { status: newStatus } as any);
    this.eventsClient.emit('admin.user.status.updated', {
      userId,
      newStatus,
    });
    return this.userRepository.findOneBy({ id: userId });
  }

  async updateUserRole(userId: string, newRole: UserRole): Promise<User> {
    if (!Object.values(UserRole).includes(newRole))
      throw new BadRequestException('Invalid role');
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');
    await this.userRepository.update(userId, { role: newRole } as any);
    this.eventsClient.emit('admin.user.role.updated', {
      userId,
      newRole,
    });
    return this.userRepository.findOneBy({ id: userId });
  }

  /* -----------------------------------------------------------------------
   * RIDE MODERATION (stubs)
   * ---------------------------------------------------------------------*/

  async getRideDetails(rideId: string) {
    const ride = await this.rideRepository.findOne({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');
    return ride;
  }

  async flagRide(rideId: string, reason: string) {
    const ride = await this.rideRepository.findOne({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');
    await this.rideRepository.update(rideId, { flagged_reason: reason } as any);
    this.eventsClient.emit('admin.ride.flagged', { rideId, reason });
    return this.rideRepository.findOneBy({ id: rideId });
  }
}
