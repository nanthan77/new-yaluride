import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  IsArray,
} from 'class-validator';
import { Expose, Type } from 'class-transformer';
import { Bid, BidStatus } from '@yaluride/database';
import { User } from '@yaluride/database';

// --- DTO for Creating a Bid ---

export class CreateBidDto {
  @ApiProperty({
    description: 'The unique identifier of the journey to bid on.',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  @IsUUID()
  @IsNotEmpty()
  journeyId: string;

  @ApiProperty({
    description: 'The amount the driver is bidding for the journey.',
    example: 3500.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'Bid amount must be a positive number.' })
  @IsNotEmpty()
  amount: number;

  @ApiPropertyOptional({
    description: 'An optional message from the driver to the passenger.',
    example: 'I have a spacious car and can get you there quickly.',
    maxLength: 300,
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  message?: string;
}

// --- DTO for API Responses ---

/**
 * A simplified DTO representing the driver who placed the bid.
 * This is nested within the BidResponseDto to avoid exposing sensitive driver info.
 */
class BidDriverDto {
  @Expose()
  @ApiProperty({ description: "The driver's unique identifier." })
  id: string;

  @Expose()
  @ApiProperty({ description: "The driver's display name." })
  display_name: string;

  @Expose()
  @ApiPropertyOptional({ description: "URL of the driver's profile picture." })
  avatar_url?: string;

  @Expose()
  @ApiProperty({ description: "The driver's average rating." })
  avg_rating_as_driver: number;

  @Expose()
  @ApiProperty({ description: "The driver's trust score." })
  trust_score: number;

  constructor(driver: User) {
    this.id = driver.id;
    // Anonymize name if needed based on rules, e.g., only show initials
    this.display_name = driver.fullName || 'Anonymous Driver';
    this.avatar_url = '';
    this.avg_rating_as_driver = 4.5; // Default rating
    this.trust_score = 85; // Default trust score
  }
}

/**
 * Defines the shape of a bid object when returned from the API.
 * It controls which data is exposed to the client.
 */
export class BidResponseDto {
  @ApiProperty({ description: 'The unique identifier for the bid.' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'The ID of the journey this bid is for.' })
  @Expose()
  journey_id: string;

  @ApiProperty({ description: 'The amount bid by the driver.' })
  @Expose()
  @Type(() => Number) // Ensure transformation from decimal/string if needed
  bid_amount: number;

  @ApiPropertyOptional({ description: 'Optional notes from the driver.' })
  @Expose()
  driver_notes?: string;

  @ApiProperty({ enum: BidStatus, description: 'The current status of the bid.' })
  @Expose()
  status: BidStatus;

  @ApiProperty({ description: 'The timestamp when the bid was created.' })
  @Expose()
  created_at: Date;

  @ApiProperty({ description: 'Details of the driver who placed the bid.', type: () => BidDriverDto })
  @Expose()
  @Type(() => BidDriverDto)
  driver: BidDriverDto;

  constructor(bid: Bid) {
    Object.assign(this, bid);
    if (bid.driver) {
      this.driver = new BidDriverDto(bid.driver);
    }
  }
}

/**
 * Defines the shape of the AI-powered bid suggestion response.
 */
export class BidSuggestionResponseDto {
  @ApiProperty({
    description: 'The AI-suggested bid amount, considered optimal.',
    example: 4200,
  })
  @IsNumber()
  suggestedBid: number;

  @ApiProperty({
    description: 'The lower end of the estimated fair price range for this journey.',
    example: 3800,
  })
  @IsNumber()
  estimatedMinBid: number;

  @ApiProperty({
    description: 'The upper end of the estimated fair price range for this journey.',
    example: 4800,
  })
  @IsNumber()
  estimatedMaxBid: number;

  @ApiProperty({
    description: 'An array of human-readable strings explaining the factors that influenced the suggestion.',
    example: [
      "Based on current high demand for this route.",
      "Slightly higher due to the weekend travel time.",
      "Priced competitively against similar recent journeys."
    ],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  explanation: string[];
}
