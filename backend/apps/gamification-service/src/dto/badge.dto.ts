import { ApiProperty } from '@nestjs/swagger';

export class BadgeDto {
  @ApiProperty({ description: 'Badge ID' })
  id: string;

  @ApiProperty({ description: 'Badge name' })
  name: string;

  @ApiProperty({ description: 'Badge description' })
  description: string;

  @ApiProperty({ description: 'Badge icon URL' })
  iconUrl: string;

  @ApiProperty({ description: 'Points required to earn this badge' })
  pointsRequired: number;

  @ApiProperty({ description: 'Badge category' })
  category: string;
}
