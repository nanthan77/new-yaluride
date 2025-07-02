import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';

import { User, UserRole } from './entities/user.entity';
import { RegisterUserDto, UpdateProfileDto, VerifyGNDto } from './user.controller';

const SALT_ROUNDS = 10;

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    @Inject('USER_EVENTS_SERVICE')
    private readonly eventsClient: ClientProxy,
  ) {}

  /**
   * Simple helper to validate a URL. This is not exhaustive but prevents obvious
   * bad input (e.g. javascript:).
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      // Ensure http/https only
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  async register(registerUserDto: RegisterUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { phone_number: registerUserDto.phoneNumber },
    });

    if (existingUser) {
      throw new ConflictException('User with this phone number already exists.');
    }

    const hashedPassword = await bcrypt.hash(registerUserDto.password, SALT_ROUNDS);

    const newUser = this.userRepository.create({
      ...registerUserDto,
      password_hash: hashedPassword,
      role: UserRole.PASSENGER, // Default role
      phone_number: registerUserDto.phoneNumber,
      phone_verified: true, // Assuming OTP verification happens before this
      email_verified: false,
      gn_verified: false,
      identity_verified: false,
      has_completed_onboarding: false, // Initialize onboarding status
    });

    this.logger.log(`Registering new user: ${newUser.name}`);
    return this.userRepository.save(newUser);
  }

  async login(phoneNumber: string, pass: string): Promise<{ accessToken: string; user: User } | null> {
    const user = await this.userRepository.findOne({ where: { phone_number: phoneNumber } });
    if (!user) {
      this.logger.warn(`Login attempt for non-existent user: ${phoneNumber}`);
      return null;
    }

    const isPasswordMatching = await bcrypt.compare(pass, user.password_hash);
    if (!isPasswordMatching) {
      this.logger.warn(`Invalid password attempt for user: ${user.id}`);
      return null;
    }

    const payload = { sub: user.id, role: user.role, phone: user.phone_number };
    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`User ${user.id} logged in successfully.`);
    return { accessToken, user };
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOneBy({ id });
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    // Prevent role change through this endpoint for security
    if ('role' in updateProfileDto) {
        delete (updateProfileDto as any).role;
    }

    this.logger.log(`Updating profile for user ${userId}`);
    await this.userRepository.update(userId, updateProfileDto);
    
    const updatedUser = await this.findById(userId);
    if (!updatedUser) {
        throw new InternalServerErrorException('Failed to retrieve updated user profile after update.');
    }
    return updatedUser;
  }

  /**
   * Updates the onboarding completion status for a user.
   * @param userId - The ID of the user to update.
   * @param hasCompletedOnboarding - The new onboarding status.
   * @returns The updated user profile.
   */
  async updateOnboardingStatus(userId: string, hasCompletedOnboarding: boolean): Promise<User> {
    this.logger.log(`Updating onboarding status for user ${userId} to ${hasCompletedOnboarding}`);
    
    // 1. Check if the user exists
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    // 2. Update the database
    await this.userRepository.update(userId, { has_completed_onboarding: hasCompletedOnboarding });
    
    // 3. Return the fully updated profile
    const updatedUser = await this.findById(userId);
    if (!updatedUser) {
      // This case is unlikely but handled for robustness
      this.logger.error(`Failed to retrieve user profile after updating onboarding status for user ${userId}`);
      throw new InternalServerErrorException('Failed to retrieve updated user profile.');
    }
    
    this.logger.log(`Onboarding status for user ${userId} successfully updated.`);
    return updatedUser;
  }

  async submitGNVerification(userId: string, verifyGNDto: VerifyGNDto): Promise<any> {
    this.logger.log(`Submitting GN verification for user ${userId}`);

    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    // Prevent duplicate submissions
    if ((user as any).gn_verified) {
      throw new ConflictException('User is already GN verified.');
    }
    if ((user as any).gn_verified_status === 'pending') {
      throw new ConflictException('A GN verification request is already pending.');
    }

    // Basic URL validation (supporting single url or array in future)
    const docsToValidate: string[] = [];
    if ((verifyGNDto as any).proofDocumentUrl) docsToValidate.push((verifyGNDto as any).proofDocumentUrl);
    if ((verifyGNDto as any).documents && Array.isArray((verifyGNDto as any).documents)) {
      docsToValidate.push(...(verifyGNDto as any).documents);
    }
    for (const url of docsToValidate) {
      if (!this.isValidUrl(url)) {
        throw new BadRequestException(`Invalid document URL provided: ${url}`);
      }
    }

    // Update user record
    await this.userRepository.update(userId, {
      gn_division_id: verifyGNDto.gnDivisionId,
      gn_verified_status: 'pending',
      gn_verification_documents: docsToValidate,
    } as any);

    // Emit event for admin service
    try {
      this.eventsClient.emit('user.gn_verification.submitted', {
        userId,
        gnDivisionId: verifyGNDto.gnDivisionId,
        documents: docsToValidate,
      });
    } catch (err) {
      this.logger.error('Failed to emit GN verification event', err);
    }

    return { message: 'GN Verification details submitted successfully and are pending review.' };
  }

  async requestPasswordReset(phoneNumber: string): Promise<void> {
    // Placeholder for password reset logic
    this.logger.log(`Password reset requested for phone number: ${phoneNumber}`);
    // This would generate a token, save it with an expiry, and trigger an SMS.
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Placeholder for reset password logic
    this.logger.log(`Attempting to reset password with token: ${token.substring(0, 5)}...`);
    // This would validate the token, find the user, hash the new password, and update the user record.
  }

  async changePassword(userId: string, currentPassword, newPassword): Promise<void> {
    // Placeholder for change password logic
    this.logger.log(`User ${userId} attempting to change password.`);
    // This would verify the current password before setting the new one.
  }
}
