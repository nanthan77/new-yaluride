import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';

// Import Entities from the shared database library
import { Badge } from '../../../../libs/database/src/entities/badge.entity';
import { UserBadge } from '../../../../libs/database/src/entities/user-badge.entity';
import { PointsLog } from '../../../../libs/database/src/entities/points-log.entity';
import { Profile } from '../../../../libs/database/src/entities/profile.entity';
import { Ride } from '../../../../libs/database/src/entities/ride.entity';

@Module({
  imports: [
    // --- Database Integration ---
    // Make the repositories for our gamification-related entities available for injection.
    TypeOrmModule.forFeature([
      Badge,
      UserBadge,
      PointsLog,
      // We also need access to other entities to check progress
      Profile, 
      Ride,
    ]),

    // --- Microservice Client Configuration ---
    // Register a client proxy to emit events to other services (e.g., notifications).
    // This configuration allows this service to send messages to a RabbitMQ queue.
    ClientsModule.registerAsync([
      {
        name: 'GAMIFICATION_EVENTS_SERVICE', // Injection token
        imports: [ConfigModule], // Import ConfigModule to use ConfigService
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL')],
            queue: 'yaluride_notifications_queue', // Example queue name for notifications
            queueOptions: {
              durable: true,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [GamificationController],
  providers: [GamificationService],
})
export class GamificationModule {}
