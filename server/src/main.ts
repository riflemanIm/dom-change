import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser = require('cookie-parser');
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const isProduction = config.get<string>('NODE_ENV') === 'production';
  const allowedOrigins = new Set(
    config
      .get<string>('CORS_ORIGINS', config.getOrThrow<string>('APP_URL'))
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin(
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) {
      const isLocalDevelopment = !isProduction
        && Boolean(origin?.match(/^http:\/\/(localhost|127\.0\.0\.1):\d+$/));
      if (!origin || allowedOrigins.has(origin) || isLocalDevelopment) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS origin is not allowed: ${origin}`), false);
    },
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle(config.get<string>('APP_NAME', 'DomObmen'))
    .setDescription('API сервиса обмена жильём')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.listen(config.get<number>('PORT', 4000));
}

void bootstrap();
