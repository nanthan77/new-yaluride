import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TourPackageModule } from './tour-package.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TourPackageModule,
  ],
})
export class AppModule {}
