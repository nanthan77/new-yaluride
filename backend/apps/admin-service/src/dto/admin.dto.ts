import { IsNotEmpty, IsString, IsUUID, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VerificationType } from '@yaluride/common';

export class ApproveVerificationDto {
  @ApiProperty({ description: 'User ID to approve verification for' })
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Type of verification to approve', enum: VerificationType })
  @IsNotEmpty()
  @IsIn(Object.values(VerificationType))
  verificationType: VerificationType;
}

export class RejectVerificationDto {
  @ApiProperty({ description: 'User ID to reject verification for' })
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Type of verification to reject', enum: VerificationType })
  @IsNotEmpty()
  @IsIn(Object.values(VerificationType))
  verificationType: VerificationType;

  @ApiProperty({ description: 'Reason for rejection' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}
