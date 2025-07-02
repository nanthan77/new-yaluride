import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AlertModule } from './alert.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AlertModule,
  ],
})
export class AppModule {}
