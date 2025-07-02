import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

// Import all required entities that the Admin Service will manage or query
import { User, Ride, DriverVerification, Profile, Payment } from '@yaluride/database';

@Module({
  imports: [
    // Make repositories for these entities available for injection
    TypeOrmModule.forFeature([
      User,
      Profile,
      Ride,
      DriverVerification,
      Payment,
      // Add any other entities the admin service needs to interact with
    ]),

    // Configure the RabbitMQ client for emitting events related to admin actions
    ClientsModule.registerAsync([
      {
        name: 'ADMIN_EVENTS_SERVICE',
        imports: [ConfigModule], // Required to use ConfigService
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')],
            queue: 'yaluride_admin_events_queue', // A dedicated queue for events originating from the admin service
            queueOptions: {
              durable: true, // Ensure the queue survives broker restarts
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService], // Export if other modules in this app need it
})
export class AdminModule {}
