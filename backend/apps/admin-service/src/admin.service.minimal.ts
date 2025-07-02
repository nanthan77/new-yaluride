import { Injectable, Logger, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { User, Ride, Company, CompanyEmployee, TravelPolicy } from '@yaluride/database';
import { UserRole, ModerationStatus, VerificationType } from '@yaluride/common';
import { ApproveVerificationDto, RejectVerificationDto } from './dto/admin.dto';

export interface PlatformStats {
  totalUsers: number;
  activeRides: number;
  totalRevenue: number;
  pendingVerifications: number;
}

interface FindUserParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
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
  ) {}

  async getPlatformStats(): Promise<PlatformStats> {
    try {
      const totalUsers = await this.userRepository.count();
      const activeRides = await this.rideRepository.count();
      const totalRevenue = 0; // Simplified for now
      const pendingVerifications = await this.userRepository.count({
        where: { moderationStatus: ModerationStatus.PENDING }
      });

      return {
        totalUsers,
        activeRides,
        totalRevenue,
        pendingVerifications,
      };
    } catch (error) {
      this.logger.error('Failed to fetch platform stats', error.stack);
      throw new InternalServerErrorException('Could not fetch platform statistics');
    }
  }

  async findUsers(params: FindUserParams) {
    const { page = 1, limit = 20, search, role, status } = params;
    try {
      const qb = this.userRepository
        .createQueryBuilder('u')
        .orderBy('u.createdAt', 'DESC')
        .take(limit)
        .skip((page - 1) * limit);

      if (search) {
        qb.andWhere(
          '(LOWER(u.fullName) ILIKE :search OR LOWER(u.email) ILIKE :search OR u.phoneNumber ILIKE :search)',
          { search: `%${search.toLowerCase()}%` },
        );
      }
      if (role) qb.andWhere('u.role = :role', { role });

      const [data, total] = await qb.getManyAndCount();
      return { data, total, page, limit };
    } catch (err) {
      this.logger.error('findUsers failed', err.stack);
      throw new InternalServerErrorException('Failed to query users');
    }
  }

  async updateUserStatus(userId: string, newStatus: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.userRepository.update(userId, { moderationStatus: newStatus as ModerationStatus });
    return this.userRepository.findOneBy({ id: userId });
  }

  async updateUserRole(userId: string, newRole: UserRole): Promise<User> {
    if (!Object.values(UserRole).includes(newRole))
      throw new BadRequestException('Invalid role');
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');
    await this.userRepository.update(userId, { role: newRole });
    return this.userRepository.findOneBy({ id: userId });
  }

  async getRideDetails(rideId: string) {
    const ride = await this.rideRepository.findOne({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');
    return ride;
  }

  async flagRide(rideId: string, reason: string) {
    const ride = await this.rideRepository.findOne({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');
    return ride;
  }

  async approveVerification(dto: ApproveVerificationDto) {
    const user = await this.userRepository.findOne({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');
    
    await this.userRepository.update(dto.userId, { 
      isVerified: true,
      moderationStatus: ModerationStatus.APPROVED 
    });
    
    return { success: true, message: 'Verification approved' };
  }

  async rejectVerification(dto: RejectVerificationDto) {
    const user = await this.userRepository.findOne({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');
    
    await this.userRepository.update(dto.userId, { 
      moderationStatus: ModerationStatus.REJECTED 
    });
    
    return { success: true, message: 'Verification rejected', reason: dto.reason };
  }

  async getPendingVerifications() {
    return this.userRepository.find({
      where: { moderationStatus: ModerationStatus.PENDING },
      select: ['id', 'fullName', 'email', 'phoneNumber', 'role', 'createdAt']
    });
  }
}
