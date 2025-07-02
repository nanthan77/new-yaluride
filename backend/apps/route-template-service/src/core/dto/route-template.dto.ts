import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsNumber, IsBoolean } from 'class-validator';

export class CreateRouteTemplateDto {
  @ApiProperty({ description: 'Name of the route template' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Description of the route template', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Array of waypoints for the route' })
  @IsArray()
  waypoints: any[];

  @ApiProperty({ description: 'Starting latitude' })
  @IsNumber()
  startLatitude: number;

  @ApiProperty({ description: 'Starting longitude' })
  @IsNumber()
  startLongitude: number;

  @ApiProperty({ description: 'Ending latitude' })
  @IsNumber()
  endLatitude: number;

  @ApiProperty({ description: 'Ending longitude' })
  @IsNumber()
  endLongitude: number;

  @ApiProperty({ description: 'Estimated duration in minutes', required: false })
  @IsOptional()
  @IsNumber()
  estimatedDurationMinutes?: number;

  @ApiProperty({ description: 'Estimated distance in kilometers', required: false })
  @IsOptional()
  @IsNumber()
  estimatedDistanceKm?: number;
}

export class UpdateRouteTemplateDto {
  @ApiProperty({ description: 'Name of the route template', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Description of the route template', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Array of waypoints for the route', required: false })
  @IsOptional()
  @IsArray()
  waypoints?: any[];

  @ApiProperty({ description: 'Whether the route template is active', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
