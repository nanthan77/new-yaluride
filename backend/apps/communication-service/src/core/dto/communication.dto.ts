import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsEnum, IsDateString } from 'class-validator';

export class GetCannedResponsesQueryDto {
  @ApiProperty({ enum: ['en', 'si', 'ta'], description: 'Language for responses' })
  @IsEnum(['en', 'si', 'ta'])
  language: string;

  @ApiProperty({ enum: ['passenger', 'driver'], description: 'User type for responses' })
  @IsEnum(['passenger', 'driver'])
  userType: string;
}

export class MessageDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsUUID()
  rideId: string;

  @ApiProperty()
  @IsUUID()
  senderId: string;

  @ApiProperty()
  @IsUUID()
  recipientId: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty()
  @IsDateString()
  sentAt: Date;

  @ApiProperty()
  @IsOptional()
  readAt?: Date;

  constructor(message: any) {
    this.id = message.id;
    this.rideId = message.rideId;
    this.senderId = message.senderId;
    this.recipientId = message.recipientId;
    this.content = message.content;
    this.sentAt = message.sentAt;
    this.readAt = message.readAt;
  }
}

export class CannedResponseDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  text: string;

  @ApiProperty()
  @IsString()
  category: string;

  @ApiProperty()
  @IsEnum(['passenger', 'driver'])
  userType: string;

  @ApiProperty()
  @IsEnum(['en', 'si', 'ta'])
  language: string;

  constructor(response: any) {
    this.id = response.id;
    this.text = response.text;
    this.category = response.category;
    this.userType = response.userType;
    this.language = response.language;
  }
}
