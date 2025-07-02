import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RideController } from './ride.controller';
import { RideService } from './ride.service';
import { Ride } from './entities/ride.entity';
import { Journey } from './entities/journey.entity'; // Ride service will likely need to update Journey status
import { Bid } from './entities/bid.entity'; // Ride service will likely need to read accepted Bid details
import { DatabaseModule } from '../../../../libs/database/src/database.module'; // Assuming a shared database module

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
    TypeOrmModule.forFeature([Ride, Journey, Bid]),

    // --- Microservice Clients Module ---
    // Registers the clients for other microservices that RideService needs to communicate with.
    ClientsModule.registerAsync([
      {
        name: 'RIDE_SERVICE_CLIENTS', // A name for the factory provider
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const rmqUrl = configService.get<string>('RABBITMQ_URL');
          if (!rmqUrl) {
            throw new Error('RABBITMQ_URL is not defined in the environment variables.');
          }
          
          // Dynamically create client configurations
          const clients = Object.values(SERVICE_NAMES).map(serviceName => ({
            name: serviceName,
            transport: Transport.RMQ,
            options: {
              urls: [rmqUrl],
              queue: `${serviceName.replace('_SERVICE', '').toLowerCase()}_queue`,
              queueOptions: {
                durable: true,
              },
            },
          }));
          
          return {
            clients,
            isGlobal: true, // Make clients available globally within this module's context
          };
        },
      },
    ]),
  ],
  controllers: [RideController],
  providers: [RideService],
  exports: [RideService], // Export service if it needs to be used in other modules within this app
})
export class RideModule {}
