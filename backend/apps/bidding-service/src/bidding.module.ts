import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { BiddingController } from './bidding.controller';
import { BiddingService } from './bidding.service';
import { BiddingStrategyService } from './bidding-strategy.service';
import { DatabaseModule } from '@yaluride/database';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/bidding-service/.env',
    }),
    
    DatabaseModule,
    
    ClientsModule.registerAsync([
      {
        name: 'BIDDING_EVENTS_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')],
            queue: 'yaluride_bidding_events_queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [BiddingController],
  providers: [BiddingService, BiddingStrategyService],
  exports: [BiddingService, BiddingStrategyService],
})
export class BiddingModule {}
