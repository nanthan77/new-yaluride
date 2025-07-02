import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BiddingModule } from './bidding.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BiddingModule,
  ],
})
export class AppModule {}
