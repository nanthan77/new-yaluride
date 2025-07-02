import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { MatchingAlgorithmService } from './matching-algorithm.service';
import { GeoService } from './location/geo.service';
import { Driver, Journey, Ride, User } from '@yaluride/database';

@Module({
  imports: [
    TypeOrmModule.forFeature([Driver, Journey, Ride, User]),
  ],
  controllers: [MatchingController],
  providers: [MatchingService, MatchingAlgorithmService, GeoService],
  exports: [MatchingService, MatchingAlgorithmService, GeoService],
})
export class MatchingModule {}
