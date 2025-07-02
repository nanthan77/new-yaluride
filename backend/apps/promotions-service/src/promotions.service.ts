import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ConflictException,
  Inject,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { randomBytes } from 'crypto';

import { Voucher, UserVoucher, ReferralCode, User, Ride } from '@yaluride/database';

import { CreateVoucherDto, VoucherDto, ApplyVoucherResponseDto } from './dto/promotions.dto';
import { DiscountType, UserVoucherStatus } from '@yaluride/common';
import { ApplyVoucherDto, ValidateVoucherDto, VoucherValidationResponse } from './dto/promotions.dto';

@Injectable()
export class PromotionsService {
  private readonly logger = new Logger(PromotionsService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
    @InjectRepository(UserVoucher)
    private readonly userVoucherRepository: Repository<UserVoucher>,
    @InjectRepository(ReferralCode)
    private readonly referralCodeRepository: Repository<ReferralCode>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Ride)
    private readonly rideRepository: Repository<Ride>,
    @Inject('PROMOTIONS_EVENTS_SERVICE') private readonly eventsClient: ClientProxy,
  ) {}

  /**
   * Generates a unique, human-readable referral code for a new user.
   * @param userId - The ID of the user to create the code for.
   * @returns The newly created ReferralCode entity.
   */
  async createReferralCodeForUser(userId: string): Promise<ReferralCode> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const existingCode = await this.referralCodeRepository.findOneBy({ userId: userId });
    if (existingCode) return existingCode;

    let code: string;
    let isUnique = false;
    do {
      code = this._generateReferralCode(user.fullName || user.email || 'User');
      const codeExists = await this.referralCodeRepository.findOneBy({ code });
      if (!codeExists) {
        isUnique = true;
      }
    } while (!isUnique);

    const newReferralCode = this.referralCodeRepository.create({
      userId: userId,
      code,
    });

    return this.referralCodeRepository.save(newReferralCode);
  }

  /**
   * Handles the logic when a new user signs up with a referral code.
   * @param newUserId - The ID of the user who just signed up.
   * @param referralCode - The referral code they used.
   */
  async handleReferral(newUserId: string, referralCode: string): Promise<void> {
    const referrerCode = await this.referralCodeRepository.findOne({
      where: { code: referralCode },
      relations: ['user'],
    });

    if (!referrerCode) {
      this.logger.warn(`Invalid referral code used during signup: ${referralCode}`);
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Increment referrer's usage count
      await queryRunner.manager.increment(ReferralCode, { id: referrerCode.id }, 'usage_count', 1);

      // Find the vouchers to award
      const referrerVoucher = await queryRunner.manager.findOneBy(Voucher, { code: 'REFERRER_BONUS' });
      const newUserVoucher = await queryRunner.manager.findOneBy(Voucher, { code: 'NEW_USER_REFERRAL' });

      // Award voucher to the referrer
      if (referrerVoucher) {
        const newReferrerVoucher = this.userVoucherRepository.create({
          userId: referrerCode.userId,
          voucherId: referrerVoucher.id,
          status: UserVoucherStatus.ACTIVE,
        });
        await queryRunner.manager.save(newReferrerVoucher);
        this.eventsClient.emit('promotion.voucher.awarded', {
          userId: referrerCode.userId,
          voucherCode: referrerVoucher.code,
          reason: 'Successful Referral',
        });
      }

      // Award voucher to the new user
      if (newUserVoucher) {
        const newSignedUpUserVoucher = this.userVoucherRepository.create({
          userId: newUserId,
          voucherId: newUserVoucher.id,
          status: UserVoucherStatus.ACTIVE,
        });
        await queryRunner.manager.save(newSignedUpUserVoucher);
        this.eventsClient.emit('promotion.voucher.awarded', {
          userId: newUserId,
          voucherCode: newUserVoucher.code,
          reason: 'Signed up with a referral code',
        });
      }

      await queryRunner.commitTransaction();
      this.logger.log(`Successfully processed referral for new user ${newUserId} by referrer ${referrerCode.userId}`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to process referral for code ${referralCode}`, error.stack);
      throw new InternalServerErrorException('Could not process referral.');
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Creates a new promotional voucher (Admin only).
   */
  async createVoucher(createDto: CreateVoucherDto): Promise<Voucher> {
    const code = createDto.code.toUpperCase();
    const existing = await this.voucherRepository.findOneBy({ code });
    if (existing) {
      throw new ConflictException(`Voucher with code '${code}' already exists.`);
    }

    const newVoucher = this.voucherRepository.create(createDto);
    return this.voucherRepository.save(newVoucher);
  }

  /**
   * Gets all vouchers a user is eligible for and has not used up.
   */
  async getAvailableVouchersForUser(userId: string): Promise<UserVoucher[]> {
    // This method would join user_vouchers and vouchers table
    // and return all vouchers with status 'ACTIVE' and not expired.
    const userVouchers = await this.userVoucherRepository.find({
        where: {
            userId: userId,
            status: UserVoucherStatus.ACTIVE,
        },
        relations: ['voucher'],
    });

    // Filter out any expired vouchers that might not have been updated by a cron job
    return userVouchers.filter(uv => uv.voucher && new Date(uv.voucher.expiresAt) > new Date());
  }

  /**
   * Validates a voucher code against a user and an optional ride context.
   */
  async validateAndCalculateDiscount(userId: string, code: string, rideAmount: number): Promise<{ discountAmount: number; voucher: Voucher }> {
    const voucher = await this.voucherRepository.findOneBy({ code: code.toUpperCase() });

    // Validation checks
    if (!voucher) throw new NotFoundException('Voucher code not found.');
    if (!voucher.isActive) throw new BadRequestException('This voucher is not currently active.');
    if (new Date(voucher.expiresAt) < new Date()) throw new BadRequestException('This voucher has expired.');
    if (rideAmount < voucher.minRideAmount) {
      throw new BadRequestException(`This voucher requires a minimum ride amount of LKR ${voucher.minRideAmount}.`);
    }

    // Check usage limits
    const totalUses = await this.userVoucherRepository.countBy({ voucherId: voucher.id });
    if (voucher.totalUsageLimit && totalUses >= voucher.totalUsageLimit) {
      throw new BadRequestException('This voucher has reached its maximum usage limit.');
    }
    const userUses = await this.userVoucherRepository.countBy({ userId: userId, voucherId: voucher.id });
    if (userUses >= voucher.usageLimitPerUser) {
      throw new BadRequestException('You have already used this voucher the maximum number of times.');
    }

    const discountAmount = this._calculateDiscount(voucher, rideAmount);

    return { discountAmount, voucher };
  }

  /**
   * Redeems a voucher for a ride. To be called within a larger transaction (e.g., payment processing).
   * Assumes validation has already occurred.
   */
  async redeemVoucher(
    manager: any, // TypeORM EntityManager
    userId: string,
    voucherId: string,
    rideId: string,
  ): Promise<void> {
    const userVoucherRepo = manager.getRepository(UserVoucher);
    const userVoucher = await userVoucherRepo.findOneBy({ userId: userId, voucherId: voucherId, status: UserVoucherStatus.ACTIVE });

    if (!userVoucher) {
      throw new BadRequestException('Voucher not available for this user or already used.');
    }

    userVoucher.status = UserVoucherStatus.REDEEMED;
    userVoucher.redeemed_at = new Date();
    userVoucher.ride_id = rideId;
    await userVoucherRepo.save(userVoucher);

    this.logger.log(`Voucher ${voucherId} redeemed for user ${userId} on ride ${rideId}.`);
    this.eventsClient.emit('promotion.voucher.redeemed', {
        userId,
        voucherId,
        rideId,
    });
  }

  // --- Private Helper Methods ---

  private _calculateDiscount(voucher: Voucher, rideAmount: number): number {
    let discount = 0;
    if (voucher.discountType === DiscountType.PERCENTAGE) {
      discount = rideAmount * (voucher.discountValue / 100);
      if (voucher.maxDiscountAmount) {
        discount = Math.min(discount, voucher.maxDiscountAmount);
      }
    } else { // FIXED_AMOUNT
      discount = voucher.discountValue;
    }
    // Ensure discount is not more than the ride amount itself
    return Math.min(discount, rideAmount);
  }

  private _generateReferralCode(name: string, length: number = 6): string {
    const namePart = name.split(' ')[0].replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4);
    const randomPart = randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length).toUpperCase();
    return `${namePart}${randomPart}`.slice(0, 10); // Ensure it's not too long
  }
}
