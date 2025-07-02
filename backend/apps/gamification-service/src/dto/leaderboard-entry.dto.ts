import { ApiProperty } from '@nestjs/swagger';

export class LeaderboardEntryDto {
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'User display name' })
  displayName: string;

  @ApiProperty({ description: 'Total points earned' })
  totalPoints: number;

  @ApiProperty({ description: 'Current rank position' })
  rank: number;

  @ApiProperty({ description: 'User avatar URL', required: false })
  avatarUrl?: string;
}
