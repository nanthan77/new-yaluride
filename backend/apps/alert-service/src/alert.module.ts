import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { AlertController } from './alert.controller';
import { AlertService } from './alert.service';
import { UserKarmaService } from './karma/user-karma.service';
import { DatabaseModule } from '@yaluride/database';
import { AlertVote } from './core/entities/alert-vote.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/alert-service/.env',
    }),
    
    DatabaseModule,
    TypeOrmModule.forFeature([AlertVote]),
    
    ClientsModule.registerAsync([
      {
        name: 'ALERT_EVENTS_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')],
            queue: 'yaluride_alert_events_queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [AlertController],
  providers: [AlertService, UserKarmaService],
  exports: [AlertService, UserKarmaService],
})
export class AlertModule {}
