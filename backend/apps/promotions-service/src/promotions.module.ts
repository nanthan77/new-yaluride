import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';
import { DatabaseModule } from '@yaluride/database';
import { Voucher, UserVoucher } from '@yaluride/database';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/promotions-service/.env',
    }),
    
    DatabaseModule,
    TypeOrmModule.forFeature([Voucher, UserVoucher]),
    
    ClientsModule.registerAsync([
      {
        name: 'PROMOTIONS_EVENTS_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')],
            queue: 'yaluride_promotions_events_queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [PromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
