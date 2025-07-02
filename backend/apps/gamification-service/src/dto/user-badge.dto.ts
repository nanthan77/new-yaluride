import { ApiProperty } from '@nestjs/swagger';

export class UserBadgeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  badgeId: string;

  @ApiProperty()
  badgeCode: string;

  @ApiProperty()
  earnedAt: Date;
}
