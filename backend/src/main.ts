import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Increase payload limit for company logos and documents (up to 10MB)
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // Security headers — basic protection
  app.use(helmet());

  // Global API prefix — saari routes /api se start hongi
  app.setGlobalPrefix('api');

  // CORS — sirf frontend URL se requests allow karo
  app.enableCors({
    origin: configService.get('frontend.url'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global validation pipe — DTO validation automatically hogi
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // Extra fields automatically remove ho jayenge
      forbidNonWhitelisted: true,
      transform: true,        // Types automatically convert honge (string -> number)
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const port = configService.get<number>('port') || 3001;
  await app.listen(port);

  console.log(`CRM Backend running on: http://localhost:${port}/api`);
  console.log(`Environment: ${configService.get('NODE_ENV') || 'development'}`);
}

bootstrap();
