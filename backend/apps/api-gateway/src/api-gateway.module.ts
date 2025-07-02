import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ThrottlerModule } from '@nestjs/throttler';

import { ApiGatewayController } from './api-gateway.controller';
import { ApiGatewayService } from './api-gateway.service';

export const SERVICE_NAMES = {
  USER_SERVICE: 'USER_SERVICE',
  RIDE_SERVICE: 'RIDE_SERVICE',
  PAYMENT_SERVICE: 'PAYMENT_SERVICE',
  COMMUNICATION_SERVICE: 'COMMUNICATION_SERVICE',
  MATCHING_SERVICE: 'MATCHING_SERVICE',
  BIDDING_SERVICE: 'BIDDING_SERVICE',
  GAMIFICATION_SERVICE: 'GAMIFICATION_SERVICE',
  PROMOTIONS_SERVICE: 'PROMOTIONS_SERVICE',
  ADMIN_SERVICE: 'ADMIN_SERVICE',
  ALERT_SERVICE: 'ALERT_SERVICE',
  ROUTE_TEMPLATE_SERVICE: 'ROUTE_TEMPLATE_SERVICE',
  TOUR_PACKAGE_SERVICE: 'TOUR_PACKAGE_SERVICE',
  VOICE_SERVICE: 'VOICE_SERVICE',
  DRIVER_SERVICE: 'DRIVER_SERVICE',
  LOCATION_SERVICE: 'LOCATION_SERVICE',
  ANALYTICS_SERVICE: 'ANALYTICS_SERVICE',
  NOTIFICATION_SERVICE: 'NOTIFICATION_SERVICE',
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/api-gateway/.env',
    }),
    
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    
    ClientsModule.register([
      {
        name: 'USER_SERVICE',
        transport: Transport.TCP,
        options: { port: 3001 },
      },
      {
        name: 'RIDE_SERVICE',
        transport: Transport.TCP,
        options: { port: 3002 },
      },
      {
        name: 'PAYMENT_SERVICE',
        transport: Transport.TCP,
        options: { port: 3003 },
      },
    ]),
  ],
  controllers: [ApiGatewayController],
  providers: [ApiGatewayService],
})
export class ApiGatewayModule {}
