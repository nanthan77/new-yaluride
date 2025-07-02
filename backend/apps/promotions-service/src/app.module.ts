import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PromotionsModule } from './promotions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PromotionsModule,
  ],
})
export class AppModule {}
