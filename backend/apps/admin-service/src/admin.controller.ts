import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Logger,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsIn,
  IsUUID,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';

import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../../../libs/auth/src/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../libs/auth/src/guards/roles.guard';
import { Roles } from '../../../../libs/common/src/decorators/roles.decorator';
import { UserRole, VerificationType } from '../../../../libs/common/src/enums/user.enums';
import { User } from '../../../../libs/database/src/entities/user.entity';
import { ApproveVerificationDto, RejectVerificationDto } from './dto/admin.dto';
import { Ride } from '../../../../libs/database/src/entities/ride.entity';

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

class CorporateProfilesQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;
}

class FindUsersQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

class UpdateUserStatusDto {
  @IsNotEmpty()
  @IsString()
  status!: string;
}

class UpdateUserRoleDto {
  @IsNotEmpty()
  @IsIn(Object.values(UserRole))
  role!: UserRole;
}

class FlagRideDto {
  @IsNotEmpty()
  @IsString()
  reason!: string;
}


@ApiTags('Admin Management')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly adminService: AdminService) {}

  @Get('verifications/pending')
  @ApiOperation({
    summary: 'Get Pending Verification Requests',
    description: 'Retrieves a list of all users with pending document verifications (GN, Driver License, Vehicle). Accessible only by admins.',
  })
  @ApiResponse({ status: 200, description: 'Successfully retrieved the list of pending verifications.', type: [User] })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token.' })
  @ApiResponse({ status: 403, description: 'Forbidden - User does not have the ADMIN role.' })
  async getPendingVerifications(): Promise<User[]> {
    this.logger.log('Fetching pending verification requests for admin dashboard.');
    return this.adminService.getPendingVerifications();
  }

  @Post('verifications/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve a Verification Request',
    description: 'Allows an admin to approve a specific verification request (e.g., GN, license) for a user.',
  })
  @ApiBody({ type: ApproveVerificationDto })
  @ApiResponse({ status: 200, description: 'Verification successfully approved.', type: User })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input data or verification not in a pending state.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async approveVerification(@Body() approveDto: ApproveVerificationDto): Promise<User> {
    this.logger.log(`Admin approving '${approveDto.verificationType}' for user ${approveDto.userId}`);
    return this.adminService.approveVerification(approveDto);
  }

  @Post('verifications/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject a Verification Request',
    description: 'Allows an admin to reject a specific verification request, providing a mandatory reason.',
  })
  @ApiBody({ type: RejectVerificationDto })
  @ApiResponse({ status: 200, description: 'Verification successfully rejected.', type: User })
  @ApiResponse({ status: 400, description: 'Bad Request - Rejection reason is required or verification not in a pending state.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async rejectVerification(@Body() rejectDto: RejectVerificationDto): Promise<User> {
    this.logger.log(`Admin rejecting '${rejectDto.verificationType}' for user ${rejectDto.userId}`);
    return this.adminService.rejectVerification(rejectDto);
  }

  // -------------------------------------------------------------------------
  // Dashboard / Stats Endpoint
  // -------------------------------------------------------------------------

  @Get('stats')
  @ApiOperation({ summary: 'Get Platform Statistics' })
  @ApiResponse({ status: 200, description: 'Statistics returned.' })
  async getPlatformStats() {
    this.logger.log('Fetching platform statistics');
    return this.adminService.getPlatformStats();
  }

  // -------------------------------------------------------------------------
  // User Management Endpoints
  // -------------------------------------------------------------------------

  @Get('users')
  @ApiOperation({ summary: 'Find Users', description: 'Search and filter users with pagination.' })
  @ApiResponse({ status: 200, description: 'Paginated users list.' })
  async findUsers(@Query() query: FindUsersQueryDto) {
    const { page = 1, limit = 20, search, role, status } = query;
    this.logger.log(`Admin searching users page=${page} limit=${limit}`);
    return this.adminService.findUsers({ page, limit, search, role, status });
  }

  @Patch('users/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update User Status' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({ type: UpdateUserStatusDto })
  @ApiResponse({ status: 200, description: 'User status updated.', type: User })
  async updateUserStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateUserStatusDto,
  ) {
    this.logger.log(`Admin updating status for user ${id} -> ${body.status}`);
    return this.adminService.updateUserStatus(id, body.status);
  }

  @Patch('users/:id/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update User Role' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({ type: UpdateUserRoleDto })
  @ApiResponse({ status: 200, description: 'User role updated.', type: User })
  async updateUserRole(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateUserRoleDto,
  ) {
    this.logger.log(`Admin updating role for user ${id} -> ${body.role}`);
    return this.adminService.updateUserRole(id, body.role);
  }

  // -------------------------------------------------------------------------
  // Ride Moderation Endpoints
  // -------------------------------------------------------------------------

  @Get('rides/:id')
  @ApiOperation({ summary: 'Get Ride Details' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: Ride })
  async getRideDetails(@Param('id', new ParseUUIDPipe()) id: string): Promise<Ride> {
    this.logger.log(`Admin fetching ride details for ${id}`);
    return this.adminService.getRideDetails(id);
  }

  @Post('rides/:id/flag')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Flag Ride for Review' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({ type: FlagRideDto })
  @ApiResponse({ status: 200, description: 'Ride flagged.', type: Ride })
  async flagRide(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: FlagRideDto,
  ) {
    this.logger.log(`Admin flagging ride ${id} for reason: ${body.reason}`);
    return this.adminService.flagRide(id, body.reason);
  }

  // -------------------------------------------------------------------------
  // Corporate Portal Endpoints
  // -------------------------------------------------------------------------

  @Get('corporate/profiles')
  @ApiOperation({
    summary: 'Get Corporate Profiles',
    description: 'Fetches a paginated list of corporate profiles. Optional search on company name.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list returned.' })
  async getCorporateProfiles(
    @Query() query: CorporateProfilesQueryDto,
  ) {
    const { page = 1, limit = 20, search } = query;
    this.logger.log(`Fetching corporate profiles page=${page} limit=${limit} search=${search || 'N/A'}`);
    return this.adminService.getCorporateProfiles(page, limit, search);
  }

  @Get('corporate/profiles/:companyId')
  @ApiOperation({
    summary: 'Get Corporate Profile Details',
    description: 'Returns full details of a single corporate profile including employees and travel policies.',
  })
  @ApiParam({ name: 'companyId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Profile details returned.' })
  @ApiResponse({ status: 404, description: 'Company not found.' })
  async getCorporateProfileById(
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
  ) {
    this.logger.log(`Fetching corporate profile ${companyId}`);
    return this.adminService.getCorporateProfileById(companyId);
  }

  @Post('corporate/profiles/:companyId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve Corporate Profile',
    description: 'Marks a corporate profile as approved/active.',
  })
  @ApiParam({ name: 'companyId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Profile approved.' })
  @ApiResponse({ status: 400, description: 'Profile already approved.' })
  @ApiResponse({ status: 404, description: 'Company not found.' })
  async approveCorporateProfile(
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
  ) {
    this.logger.log(`Approving corporate profile ${companyId}`);
    return this.adminService.approveCorporateProfile(companyId);
  }

  @Post('corporate/profiles/:companyId/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Suspend Corporate Profile',
    description: 'Suspends/deactivates a corporate profile.',
  })
  @ApiParam({ name: 'companyId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Profile suspended.' })
  @ApiResponse({ status: 400, description: 'Profile already suspended.' })
  @ApiResponse({ status: 404, description: 'Company not found.' })
  async suspendCorporateProfile(
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
  ) {
    this.logger.log(`Suspending corporate profile ${companyId}`);
    return this.adminService.suspendCorporateProfile(companyId);
  }
}
