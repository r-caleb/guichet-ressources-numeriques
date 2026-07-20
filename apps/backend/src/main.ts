import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
          fontSrc: ["'self'", 'data:'],
        },
      },
    }),
  );
  const allowedOrigins = (
    config.get<string>('FRONTEND_ORIGINS') ??
    config.get<string>('FRONTEND_ORIGIN') ??
    'http://localhost:3000,https://guichet-ressources-numeriques-front.vercel.app,https://*.vercel.app'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
      if (!origin) {
        callback(null, true);
        return;
      }

      const isWildcardAllowed = allowedOrigins.includes('*');
      const isExactOriginAllowed = allowedOrigins.includes(origin);
      const isVercelPreviewAllowed =
        allowedOrigins.includes('https://*.vercel.app') && /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin);

      callback(null, isWildcardAllowed || isExactOriginAllowed || isVercelPreviewAllowed);
    },
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Guichet des ressources numériques gouvernementales')
    .setDescription('API de dépôt, suivi et instruction des demandes .gouv.cd')
    .setVersion('0.1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();

  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.listen(config.get<number>('PORT') ?? 4000);
}

void bootstrap();
