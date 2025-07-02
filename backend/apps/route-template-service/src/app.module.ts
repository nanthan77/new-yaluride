import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RouteTemplateModule } from './route-template.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RouteTemplateModule,
  ],
})
export class AppModule {}
