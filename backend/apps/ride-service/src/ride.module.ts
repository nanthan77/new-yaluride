import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RideController } from './ride.controller';
import { RideService } from './ride.service';
import { Ride } from '@yaluride/database';
import { DatabaseModule } from '@yaluride/database';

// Define service names for injection, consistent with the API Gateway
export const SERVICE_NAMES = {
  NOTIFICATION_SERVICE: 'NOTIFICATION_SERVICE',
  USER_SERVICE: 'USER_SERVICE',
  DRIVER_SERVICE: 'DRIVER_SERVICE',
  PAYMENT_SERVICE: 'PAYMENT_SERVICE',
};

@Module({
  imports: [
    // --- Configuration Module ---
    // Loads environment variables from a .env file and makes them available globally.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/ride-service/.env', // Path relative to monorepo root
    }),

    // --- Database & TypeORM Module ---
    // Connects to the database via the shared DatabaseModule and registers
    // the specific entities this service will manage.
    DatabaseModule,
    TypeOrmModule.forFeature([Ride]),

    ClientsModule.registerAsync([
      {
        name: 'RIDE_EVENTS_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')],
            queue: 'yaluride_ride_events_queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [RideController],
  providers: [RideService],
  exports: [RideService], // Export service if it needs to be used in other modules within this app
})
export class RideModule {}
