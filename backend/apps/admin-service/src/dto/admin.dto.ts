import { ApiProperty } from '@nestjs/swagger';

export class ApproveVerificationDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  verificationType: string;

  @ApiProperty()
  notes?: string;
}

export class RejectVerificationDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  verificationType: string;

  @ApiProperty()
  reason: string;
  
  @ApiProperty()
  notes?: string;
}

export class UpdateUserStatusDto {
  @ApiProperty()
  status: string;
}

export class UpdateUserRoleDto {
  @ApiProperty()
  role: string;
}

export class FlagRideDto {
  @ApiProperty()
  reason: string;
}
