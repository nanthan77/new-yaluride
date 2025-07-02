import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RideModule } from './ride.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RideModule,
  ],
})
export class AppModule {}
