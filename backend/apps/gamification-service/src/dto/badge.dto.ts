import { ApiProperty } from '@nestjs/swagger';

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
