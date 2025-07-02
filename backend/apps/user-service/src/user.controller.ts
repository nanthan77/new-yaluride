import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
  Patch,
} from '@nestjs/common';
import { UserService } from './user.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiProperty,
} from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  Matches,
  IsOptional,
  IsPhoneNumber,
  IsUUID,
} from 'class-validator';
import { Expose, Type } from 'class-transformer';
import { JwtAuthGuard } from '@yaluride/auth';
import { UserDecorator, UserRole } from '@yaluride/common';
import { User } from '@yaluride/database';
import { ClientProxy } from '@nestjs/microservices';

// --- Data Transfer Objects (DTOs) ---

export class RegisterUserDto {
  @ApiProperty({ example: '+94771234567', description: 'User phone number (Sri Lankan format)' })
  @IsNotEmpty({ message: 'Phone number is required.' })
  @IsPhoneNumber('LK', { message: 'Invalid Sri Lankan phone number format.' })
  phoneNumber: string;

  @ApiProperty({ example: 'P@$$wOrd123', description: 'User password' })
  @IsNotEmpty({ message: 'Password is required.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password too weak. Must include uppercase, lowercase, number, and special character.',
  })
  password: string;

  @ApiProperty({ example: 'Nanthan Gopal', description: 'User full name' })
  @IsNotEmpty({ message: 'Name is required.' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'en', description: 'Preferred language (en, si, ta)', required: false })
  @IsOptional()
  @IsString()
  language?: string;
}

export class LoginUserDto {
  @ApiProperty({ example: '+94771234567', description: 'User phone number' })
  @IsNotEmpty({ message: 'Phone number is required.' })
  @IsPhoneNumber('LK', { message: 'Invalid Sri Lankan phone number format.' })
  phoneNumber: string;

  @ApiProperty({ example: 'P@$$wOrd123', description: 'User password' })
  @IsNotEmpty({ message: 'Password is required.' })
  password: string;
}

export class UpdateProfileDto {
  @ApiProperty({ example: 'Nanthan Kumar Gopal', description: 'User full name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'nanthan.gopal@example.com', description: 'User email address', required: false })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format.' })
  email?: string;

  @ApiProperty({ example: 'https://example.com/profile.jpg', description: 'Profile picture URL', required: false })
  @IsOptional()
  @IsString() // In a real app, this might be a file upload or a URL to an uploaded image
  profilePictureUrl?: string;

  @ApiProperty({ example: 'si', description: 'Preferred language (en, si, ta)', required: false })
  @IsOptional()
  @IsString()
  language?: string;
}

export class VerifyGNDto {
  @ApiProperty({ example: 'COL-DS-GN-001', description: 'Grama Niladari Division ID' })
  @IsNotEmpty()
  @IsString()
  gnDivisionId: string;

  @ApiProperty({ example: 'https://example.com/proof.pdf', description: 'URL to proof document' })
  @IsNotEmpty()
  @IsString() // URL to an uploaded document
  proofDocumentUrl: string;
}

export class RequestPasswordResetDto {
  @ApiProperty({ example: '+94771234567', description: 'User phone number for password reset' })
  @IsNotEmpty({ message: 'Phone number is required.' })
  @IsPhoneNumber('LK', { message: 'Invalid Sri Lankan phone number format.' })
  phoneNumber: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'reset_token_from_sms_or_email', description: 'Password reset token' })
  @IsNotEmpty()
  @IsString()
  token: string;

  @ApiProperty({ example: 'NewP@$$wOrd123', description: 'New password' })
  @IsNotEmpty({ message: 'New password is required.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'New password too weak. Must include uppercase, lowercase, number, and special character.',
  })
  newPassword: string;
}

/**
 * DTO for updating the user's onboarding completion status.
 */
export class UpdateOnboardingStatusDto {
  @ApiProperty({
    description: 'Indicates whether the user has completed onboarding.',
    example: true,
  })
  @IsNotEmpty()
  hasCompletedOnboarding: boolean;
}

// --- Response DTOs ---
export class UserResponseDto {
  @ApiProperty({ example: 'c1b9a7a0-5c3c-4e3d-8f1a-2b4c6d8e0f9a', description: 'User ID' })
  @Expose()
  id: string;

  @ApiProperty({ example: '+94771234567', description: 'User phone number' })
  @Expose()
  phoneNumber: string;

  @ApiProperty({ example: 'Nanthan Gopal', description: 'User full name' })
  @Expose()
  name: string;

  @ApiProperty({ example: 'nanthan.gopal@example.com', nullable: true, description: 'User email address' })
  @Expose()
  email?: string;

  @ApiProperty({ example: UserRole.PASSENGER, enum: UserRole, description: 'User role' })
  @Expose()
  role: UserRole;

  @ApiProperty({ example: 'https://example.com/profile.jpg', nullable: true, description: 'Profile picture URL' })
  @Expose()
  profilePictureUrl?: string;

  @ApiProperty({ example: 'en', description: 'Preferred language' })
  @Expose()
  language?: string;

  @ApiProperty({ example: true, description: 'Indicates if Grama Niladari verification is complete' })
  @Expose()
  isGnVerified: boolean;

  @ApiProperty({ example: 'COL-DS-GN-001', nullable: true, description: 'Grama Niladari Division ID' })
  @Expose()
  gnDivisionId?: string;

  @ApiProperty({ description: 'User creation timestamp' })
  @Expose()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ description: 'User last update timestamp' })
  @Expose()
  @Type(() => Date)
  updatedAt: Date;

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
    // Ensure sensitive data like passwordHash is not exposed
  }
}

export class LoginResponseDto {
  @ApiProperty({ description: 'Authenticated user details' })
  @Type(() => UserResponseDto)
  @Expose()
  user: UserResponseDto;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'JWT access token' })
  @Expose()
  accessToken: string;

  constructor(user: User, accessToken: string) {
    this.user = new UserResponseDto(user);
    this.accessToken = accessToken;
  }
}

// --- Controller ---
@ApiTags('User Management')
@Controller('users')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class UserController {
  constructor(
    private readonly userService: UserService,
    @Inject('USER_EVENTS_SERVICE') private readonly userEventsClient: ClientProxy,
  ) {
    // Ensure RabbitMQ client is connected on module init
    // this.userEventsClient.connect().catch(err => console.error('Failed to connect to RabbitMQ User Events Service', err));
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterUserDto })
  @ApiResponse({ status: 201, description: 'User registered successfully.', type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation error or user already exists.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async register(@Body() registerUserDto: RegisterUserDto): Promise<UserResponseDto> {
    try {
      const user = await this.userService.register(registerUserDto);
      this.userEventsClient.emit('user_registered', { userId: user.id, phoneNumber: user.phoneNumber, name: user.fullName, language: user.language });
      return new UserResponseDto(user);
    } catch (error) {
      if (error.message.includes('already exists')) { // More specific error handling from service
        throw new BadRequestException(error.message);
      }
      throw error; // Rethrow other errors to be handled by global exception filter
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login an existing user' })
  @ApiBody({ type: LoginUserDto })
  @ApiResponse({ status: 200, description: 'User logged in successfully.', type: LoginResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid credentials.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid credentials.' })
  async login(@Body() loginUserDto: LoginUserDto): Promise<LoginResponseDto> {
    const result = await this.userService.login(loginUserDto.phoneNumber, loginUserDto.password);
    if (!result) {
      throw new UnauthorizedException('Invalid credentials. Please check your phone number and password.');
    }
    this.userEventsClient.emit('user_logged_in', { userId: result.user.id });
    return new LoginResponseDto(result.user, result.accessToken);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully.', type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token missing or invalid.' })
  @ApiResponse({ status: 404, description: 'Not Found - User profile not found.' })
  async getProfile(@UserDecorator() currentUser: User): Promise<UserResponseDto> {
    // The UserDecorator extracts the user object injected by JwtAuthGuard
    const user = await this.userService.findById(currentUser.id);
    if (!user) {
      throw new NotFoundException(`User with ID ${currentUser.id} not found.`);
    }
    return new UserResponseDto(user);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({ status: 200, description: 'User profile updated successfully.', type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation error.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async updateProfile(
    @UserDecorator() currentUser: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const updatedUser = await this.userService.updateProfile(currentUser.id, updateProfileDto);
    this.userEventsClient.emit('user_profile_updated', { userId: updatedUser.id, changes: updateProfileDto });
    return new UserResponseDto(updatedUser);
  }

  @Post('profile/gn-verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit Grama Niladari verification details' })
  @ApiBody({ type: VerifyGNDto })
  @ApiResponse({ status: 200, description: 'GN verification details submitted successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation error or already verified.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async verifyGN(
    @UserDecorator() currentUser: User,
    @Body() verifyGNDto: VerifyGNDto,
  ): Promise<{ message: string; details?: any }> {
    try {
      const result = await this.userService.submitGNVerification(currentUser.id, verifyGNDto);
      this.userEventsClient.emit('user_gn_verification_submitted', { userId: currentUser.id, gnDivisionId: verifyGNDto.gnDivisionId });
      return { message: 'GN verification details submitted successfully. Awaiting approval.', details: result };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to submit GN verification details.');
    }
  }

  @Post('password/request-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset token' })
  @ApiBody({ type: RequestPasswordResetDto })
  @ApiResponse({ status: 200, description: 'Password reset instructions sent if user exists.' })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation error.' })
  @ApiResponse({ status: 404, description: 'Not Found - User with provided phone number not found.' })
  async requestPasswordReset(
    @Body() requestPasswordResetDto: RequestPasswordResetDto,
  ): Promise<{ message: string }> {
    try {
      await this.userService.requestPasswordReset(requestPasswordResetDto.phoneNumber);
      // Event for notification service to send SMS/email with token
      this.userEventsClient.emit('user_password_reset_requested', { phoneNumber: requestPasswordResetDto.phoneNumber });
      // Generic message for security reasons (don't reveal if user exists)
      return { message: 'If an account with this phone number exists, password reset instructions have been sent.' };
    } catch (error) {
      if (error instanceof NotFoundException) {
         // Still return a generic message to prevent user enumeration
        return { message: 'If an account with this phone number exists, password reset instructions have been sent.' };
      }
      throw error;
    }
  }

  @Post('password/reset')
  /* ------------------------------------------------------------------
   *  PATCH /users/profile/onboarding-status
   * ------------------------------------------------------------------ */
  @Patch('profile/onboarding-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update onboarding completion status',
    description: 'Marks onboarding as completed/incomplete for the authenticated user.',
  })
  @ApiBody({ type: UpdateOnboardingStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Onboarding status updated successfully.',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation error.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async updateOnboardingStatus(
    @UserDecorator() currentUser: User,
    @Body() dto: UpdateOnboardingStatusDto,
  ): Promise<UserResponseDto> {
    const updatedUser = await this.userService.updateOnboardingStatus(
      currentUser.id,
      dto.hasCompletedOnboarding,
    );

    if (dto.hasCompletedOnboarding) {
      this.userEventsClient.emit('user_onboarding_completed', { userId: currentUser.id });
    }

    return new UserResponseDto(updatedUser);
  }

  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using a token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Password reset successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid token or validation error.' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    try {
      await this.userService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword);
      this.userEventsClient.emit('user_password_reset_completed', { tokenUsed: resetPasswordDto.token }); // Avoid logging new password
      return { message: 'Password has been reset successfully. Please login with your new password.' };
    } catch (error) {
      if (error.message.includes('Invalid or expired token') || error.message.includes('User not found')) {
        throw new BadRequestException('Invalid or expired password reset token.');
      }
      throw error;
    }
  }

  // Example: Endpoint to change password when logged in
  @Patch('password/change')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change current user password' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        currentPassword: { type: 'string', format: 'password', example: 'CurrentP@$$wOrd' },
        newPassword: { type: 'string', format: 'password', example: 'NewP@$$wOrd123' },
      },
      required: ['currentPassword', 'newPassword'],
    },
  })
  @ApiResponse({ status: 200, description: 'Password changed successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation error or incorrect current password.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async changePassword(
    @UserDecorator() currentUser: User,
    @Body('currentPassword') currentPassword: string,
    @Body('newPassword') newPassword: ResetPasswordDto['newPassword'], // Reuse validation from ResetPasswordDto
  ): Promise<{ message: string }> {
     // Validate newPassword separately if not using a full DTO with class-validator for this specific body
    if (newPassword.length < 8 || !/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/.test(newPassword)) {
        throw new BadRequestException('New password too weak. Must include uppercase, lowercase, number, and special character, and be at least 8 characters long.');
    }

    await this.userService.changePassword(currentUser.id, currentPassword, newPassword);
    this.userEventsClient.emit('user_password_changed', { userId: currentUser.id });
    return { message: 'Password changed successfully.' };
  }


  // --- Admin specific endpoints (Example - could be in a separate AdminUserController) ---
  @Get(':id')
  @UseGuards(JwtAuthGuard) // Add AdminRoleGuard here
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by ID (Admin)' })
  @ApiParam({ name: 'id', description: 'User ID', type: 'string' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden.'})
  @ApiResponse({ status: 404, description: 'User not found.'})
  async getUserByIdForAdmin(@UserDecorator() adminUser: User, @Param('id') userId: string): Promise<UserResponseDto> {
    // Implement role check for adminUser here or via AdminRoleGuard
    if (adminUser.role !== UserRole.ADMIN) {
        throw new UnauthorizedException('Admin access required.');
    }
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }
    return new UserResponseDto(user);
  }

  // --- Cleanup for RabbitMQ client on module destroy ---
  async onModuleDestroy() {
    await this.userEventsClient.close();
  }
}
