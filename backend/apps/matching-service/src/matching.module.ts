import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { MatchingController } from './matching.controller';
import { MatchingAlgorithmService } from './matching-algorithm.service';
import { GeoService } from './location/geo.service';
import { DatabaseModule } from '@yaluride/database';
import { Ride, User, Driver } from '@yaluride/database';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/matching-service/.env',
    }),
    
    DatabaseModule,
    TypeOrmModule.forFeature([Ride, User, Driver]),
    
    ClientsModule.registerAsync([
      {
        name: 'MATCHING_EVENTS_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')],
            queue: 'yaluride_matching_events_queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [MatchingController],
  providers: [MatchingAlgorithmService, GeoService],
  exports: [MatchingAlgorithmService, GeoService],
})
export class MatchingModule {}
