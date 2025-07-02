import { Module } from '@nestjs/common';
import { ApiGatewayController } from './api-gateway.controller';
import { ApiGatewayService } from './api-gateway.service';

export const SERVICE_NAMES = {
  ADMIN_SERVICE: 'ADMIN_SERVICE',
  ALERT_SERVICE: 'ALERT_SERVICE',
  BIDDING_SERVICE: 'BIDDING_SERVICE',
  COMMUNICATION_SERVICE: 'COMMUNICATION_SERVICE',
  GAMIFICATION_SERVICE: 'GAMIFICATION_SERVICE',
  MATCHING_SERVICE: 'MATCHING_SERVICE',
  PAYMENT_SERVICE: 'PAYMENT_SERVICE',
  PROMOTIONS_SERVICE: 'PROMOTIONS_SERVICE',
  RIDE_SERVICE: 'RIDE_SERVICE',
  ROUTE_TEMPLATE_SERVICE: 'ROUTE_TEMPLATE_SERVICE',
  TOUR_PACKAGE_SERVICE: 'TOUR_PACKAGE_SERVICE',
  USER_SERVICE: 'USER_SERVICE',
  VOICE_SERVICE: 'VOICE_SERVICE',
} as const;

@Module({
  controllers: [ApiGatewayController],
  providers: [ApiGatewayService],
})
export class ApiGatewayModule {}
