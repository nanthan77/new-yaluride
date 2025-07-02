import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { UserKarmaLog } from '../entities/user-karma-log.entity';

/**
 * Data Transfer Object for representing a single karma log entry in API responses.
 * It uses the `@Expose()` decorator from class-transformer to explicitly define
 * which properties of the UserKarmaLog entity should be included in the response.
 */
export class KarmaLogResponseDto {
  @ApiProperty({ description: 'The unique identifier for the log entry.', example: 101 })
  @Expose()
  id: number;

  @ApiProperty({ description: 'The ID of the user associated with this log.' })
  @Expose()
  user_id: string;

  @ApiProperty({ description: 'The amount karma changed by (can be positive or negative).', example: 5 })
  @Expose()
  change_amount: number;

  @ApiProperty({ description: 'The user\'s karma score after this change was applied.', example: 55 })
  @Expose()
  new_karma_score: number;

  @ApiProperty({ description: 'A machine-readable reason for the karma change.', example: 'ALERT_CONFIRMED_BY_COMMUNITY' })
  @Expose()
  reason: string;

  @ApiProperty({ description: 'The ID of the related alert, if applicable.', required: false })
  @Expose()
  related_alert_id?: string;

  @ApiProperty({ description: 'The timestamp when the karma change was logged.' })
  @Expose()
  created_at: Date;

  constructor(partial: Partial<UserKarmaLog>) {
    Object.assign(this, partial);
  }
}
