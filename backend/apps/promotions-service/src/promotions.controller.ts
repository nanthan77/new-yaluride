import {
    Controller,
    Get,
    Post,
    Body,
    UseGuards,
    Logger,
    HttpCode,
    HttpStatus,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiBody,
} from '@nestjs/swagger';

import { PromotionsService } from './promotions.service';
import { JwtAuthGuard, RolesGuard } from '@yaluride/auth';
import { Roles, UserDecorator, UserRole } from '@yaluride/common';
import { User } from '@yaluride/database';
import {
    CreateVoucherDto,
    ApplyVoucherDto,
    VoucherDto,
    ApplyVoucherResponseDto,
    UserVoucherDto,
} from './dto/promotions.dto';

@ApiTags('Promotions & Vouchers')
@Controller('promotions')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class PromotionsController {
    private readonly logger = new Logger(PromotionsController.name);

    constructor(private readonly promotionsService: PromotionsService) {}

    // --- Admin-only Endpoints ---

    @Post('/vouchers')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new voucher (Admin only)' })
    @ApiResponse({ status: 201, description: 'Voucher created successfully.', type: VoucherDto })
    @ApiResponse({ status: 403, description: 'Forbidden. Admin access required.' })
    @ApiResponse({ status: 409, description: 'Conflict. A voucher with this code already exists.' })
    async createVoucher(@Body() createVoucherDto: CreateVoucherDto): Promise<VoucherDto> {
        this.logger.log(`Admin creating new voucher with code: ${createVoucherDto.code}`);
        const voucher = await this.promotionsService.createVoucher(createVoucherDto);
        return new VoucherDto(voucher);
    }

    // --- Authenticated User Endpoints ---

    @Get('/my-vouchers')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all available vouchers for the current user' })
    @ApiResponse({ status: 200, description: 'List of available vouchers.', type: [UserVoucherDto] })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    async getMyVouchers(@UserDecorator() user: User): Promise<UserVoucherDto[]> {
        this.logger.log(`Fetching available vouchers for user ${user.id}`);
        const userVouchers = await this.promotionsService.getAvailableVouchersForUser(user.id);
        return userVouchers.map(uv => new UserVoucherDto(uv));
    }

    @Post('/apply-voucher')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Apply a voucher to a ride',
        description: 'Validates a voucher code against a ride amount and returns the calculated discount.',
    })
    @ApiBody({ type: ApplyVoucherDto })
    @ApiResponse({ status: 200, description: 'Voucher is valid and discount calculated.', type: ApplyVoucherResponseDto })
    @ApiResponse({ status: 400, description: 'Bad Request (e.g., voucher expired, invalid, or not applicable).' })
    @ApiResponse({ status: 404, description: 'Voucher code not found.' })
    async applyVoucher(
        @UserDecorator() user: User,
        @Body() applyVoucherDto: ApplyVoucherDto,
    ): Promise<ApplyVoucherResponseDto> {
        this.logger.log(`User ${user.id} applying voucher '${applyVoucherDto.voucherCode}' to order amount ${applyVoucherDto.orderAmount}`);
        
        // This service method now handles both validation and discount calculation
        const result = await this.promotionsService.validateAndCalculateDiscount(
            user.id,
            applyVoucherDto.voucherCode,
            applyVoucherDto.orderAmount
        );

        return {
            success: true,
            discountAmount: result.discountAmount,
            finalAmount: applyVoucherDto.orderAmount - result.discountAmount,
            message: 'Voucher applied successfully',
            voucher: new VoucherDto(result.voucher),
        };
    };

    // Note: The actual redemption of the voucher should happen when the ride payment is processed,
    // not just when checking the price. The payment service would call a `redeemVoucher` method
    // within a transaction. This `applyVoucher` endpoint is for showing the user the potential discount.

    // --- Event Listeners ---

    @EventPattern('user.signed_up.with_referral')
    async handleUserReferred(@Payload() data: { newUserId: string; referralCode: string }) {
        this.logger.log(`Handling referral signup event for new user ${data.newUserId} with code ${data.referralCode}`);
        try {
            await this.promotionsService.handleReferral(data.newUserId, data.referralCode);
        } catch (error) {
            this.logger.error(`Failed to process referral for user ${data.newUserId}`, error.stack);
            // Depending on broker, might need to handle ack/nack
        }
    }
}
