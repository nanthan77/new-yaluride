import { ApiProperty } from '@nestjs/swagger';
import { BadgeDto } from './badge.dto';

export class UserBadgeDto {
  @ApiProperty({ description: 'User badge record ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Badge information' })
  badge: BadgeDto;

  @ApiProperty({ description: 'Date when badge was earned' })
  earnedAt: Date;

  @ApiProperty({ description: 'Points earned when badge was awarded' })
  pointsEarned: number;
}
