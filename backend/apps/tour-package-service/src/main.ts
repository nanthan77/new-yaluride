import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { TourPackageModule } from './tour-package.module';

async function bootstrap() {
  const app = await NestFactory.create(TourPackageModule);
  
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  const config = new DocumentBuilder()
    .setTitle('YALURIDE Tour Package Service')
    .setDescription('Tour packages and travel booking service')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3012;
  await app.listen(port);
  console.log(`Tour Package Service is running on: http://localhost:${port}`);
}
bootstrap();
