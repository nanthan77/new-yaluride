import { ApiProperty } from '@nestjs/swagger';

export class LeaderboardEntryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty()
  pointsBalance: number;

  @ApiProperty()
  rank: number;
}

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

export class BadgeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  iconUrl: string;

  @ApiProperty()
  pointsReward: number;
}
