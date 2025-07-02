export class CreateVoucherDto {
  code: string;
  description: string;
  discountType: string;
  discountValue: number;
  minOrderValue?: number;
  maxDiscountAmount?: number;
  validFrom: Date;
  validUntil: Date;
  usageLimit?: number;
  isActive: boolean;
}

export class VoucherDto {
  id: string;
  code: string;
  description: string;
  discountType: string;
  discountValue: number;
  minOrderValue?: number;
  maxDiscountAmount?: number;
  validFrom: Date;
  validUntil: Date;
  usageLimit?: number;
  usageCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any) {
    this.id = data.id;
    this.code = data.code;
    this.description = data.description;
    this.discountType = data.discountType;
    this.discountValue = data.discountValue;
    this.minOrderValue = data.minOrderValue;
    this.maxDiscountAmount = data.maxDiscountAmount;
    this.validFrom = data.validFrom;
    this.validUntil = data.validUntil;
    this.usageLimit = data.usageLimit;
    this.usageCount = data.usageCount;
    this.isActive = data.isActive;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}

export class ApplyVoucherDto {
  code: string;
  rideId: string;
  userId: string;
  rideAmount: number;
}

export class UserVoucherDto {
  id: string;
  userId: string;
  voucherId: string;
  status: string;
  usedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(data?: any) {
    if (data) {
      this.id = data.id;
      this.userId = data.userId;
      this.voucherId = data.voucherId;
      this.status = data.status;
      this.usedAt = data.usedAt;
      this.createdAt = data.createdAt;
      this.updatedAt = data.updatedAt;
    }
  }
}

export class ApplyVoucherResponseDto {
  success: boolean;
  discountAmount: number;
  message: string;

  constructor(rideAmount?: number, discountAmount?: number, voucher?: any) {
    this.success = true;
    this.discountAmount = discountAmount || 0;
    this.message = `Discount of ${discountAmount} applied successfully`;
  }
}

export class ValidateVoucherDto {
  voucherCode: string;
  userId: string;
  rideAmount: number;
}

export class VoucherValidationResponse {
  isValid: boolean;
  discountAmount: number;
  message: string;
}
