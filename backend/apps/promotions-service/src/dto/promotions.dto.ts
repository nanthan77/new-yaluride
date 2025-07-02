import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsUUID, IsDateString, Min, Max } from 'class-validator';
import { DiscountType, UserVoucherStatus } from '@yaluride/common';

export class CreateVoucherDto {
  @ApiProperty({ example: 'WELCOME10', description: 'Voucher code' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Welcome discount', description: 'Voucher description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'percentage', enum: DiscountType, description: 'Type of discount' })
  @IsEnum(DiscountType)
  discountType: DiscountType;

  @ApiProperty({ example: 10, description: 'Discount value' })
  @IsNumber()
  @Min(0)
  discountValue: number;

  @ApiProperty({ example: 100, description: 'Maximum discount amount', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @ApiProperty({ example: 50, description: 'Minimum order amount', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @ApiProperty({ example: '2024-12-31T23:59:59Z', description: 'Expiry date' })
  @IsDateString()
  expiryDate: string;

  @ApiProperty({ example: 100, description: 'Usage limit', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;
}

export class VoucherDto {
  @ApiProperty({ example: 'uuid', description: 'Voucher ID' })
  id: string;

  @ApiProperty({ example: 'WELCOME10', description: 'Voucher code' })
  code: string;

  @ApiProperty({ example: 'Welcome discount', description: 'Voucher description' })
  description: string;

  @ApiProperty({ example: 'percentage', enum: DiscountType, description: 'Type of discount' })
  discountType: DiscountType;

  @ApiProperty({ example: 10, description: 'Discount value' })
  discountValue: number;

  @ApiProperty({ example: 100, description: 'Maximum discount amount' })
  maxDiscountAmount?: number;

  @ApiProperty({ example: 50, description: 'Minimum order amount' })
  minOrderAmount?: number;

  @ApiProperty({ example: '2024-12-31T23:59:59Z', description: 'Expiry date' })
  expiryDate: Date;

  @ApiProperty({ example: 100, description: 'Usage limit' })
  usageLimit?: number;

  @ApiProperty({ example: 25, description: 'Times used' })
  usageCount: number;

  @ApiProperty({ example: true, description: 'Is voucher active' })
  isActive: boolean;

  constructor(voucher: any) {
    this.id = voucher.id;
    this.code = voucher.code;
    this.description = voucher.description;
    this.discountType = voucher.discountType;
    this.discountValue = voucher.discountValue;
    this.maxDiscountAmount = voucher.maxDiscountAmount;
    this.minOrderAmount = voucher.minRideAmount;
    this.expiryDate = voucher.expiresAt || voucher.validUntil;
    this.usageLimit = voucher.totalUsageLimit;
    this.usageCount = voucher.usageCount || 0;
    this.isActive = voucher.isActive;
  }
}

export class ApplyVoucherDto {
  @ApiProperty({ example: 'WELCOME10', description: 'Voucher code to apply' })
  @IsString()
  @IsNotEmpty()
  voucherCode: string;

  @ApiProperty({ example: 150, description: 'Order amount' })
  @IsNumber()
  @Min(0)
  orderAmount: number;

  @ApiProperty({ example: 'uuid', description: 'User ID' })
  @IsUUID()
  userId: string;
}

export class ValidateVoucherDto {
  @ApiProperty({ example: 'WELCOME10', description: 'Voucher code to validate' })
  @IsString()
  @IsNotEmpty()
  voucherCode: string;

  @ApiProperty({ example: 'uuid', description: 'User ID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 150, description: 'Order amount', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  orderAmount?: number;
}

export class ApplyVoucherResponseDto {
  @ApiProperty({ example: true, description: 'Whether voucher was applied successfully' })
  success: boolean;

  @ApiProperty({ example: 15, description: 'Discount amount applied' })
  discountAmount: number;

  @ApiProperty({ example: 135, description: 'Final amount after discount' })
  finalAmount: number;

  @ApiProperty({ example: 'Voucher applied successfully', description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Voucher details', type: VoucherDto, required: false })
  voucher?: VoucherDto;
}

export class UserVoucherDto {
  @ApiProperty({ example: 'uuid', description: 'User voucher ID' })
  id: string;

  @ApiProperty({ example: 'uuid', description: 'User ID' })
  userId: string;

  @ApiProperty({ example: 'uuid', description: 'Voucher ID' })
  voucherId: string;

  @ApiProperty({ example: 'ACTIVE', enum: UserVoucherStatus, description: 'Voucher status' })
  status: UserVoucherStatus;

  @ApiProperty({ description: 'Voucher details', type: VoucherDto })
  voucher: VoucherDto;

  @ApiProperty({ example: '2024-01-15T10:30:00Z', description: 'Date voucher was assigned' })
  assignedAt: Date;

  @ApiProperty({ example: '2024-01-20T14:45:00Z', description: 'Date voucher was used', required: false })
  usedAt?: Date;

  constructor(userVoucher: any) {
    this.id = userVoucher.id;
    this.userId = userVoucher.userId;
    this.voucherId = userVoucher.voucherId;
    this.status = userVoucher.status;
    this.voucher = userVoucher.voucher;
    this.assignedAt = userVoucher.assignedAt;
    this.usedAt = userVoucher.usedAt;
  }
}

export class VoucherValidationResponse {
  @ApiProperty({ example: true, description: 'Whether voucher is valid' })
  isValid: boolean;

  @ApiProperty({ example: 'Voucher is valid', description: 'Validation message' })
  message: string;

  @ApiProperty({ description: 'Voucher details', type: VoucherDto, required: false })
  voucher?: VoucherDto;

  @ApiProperty({ example: 15, description: 'Potential discount amount', required: false })
  potentialDiscount?: number;
}
