import 'reflect-metadata';
import 'dotenv/config';
import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Copia server/.env.example a server/.env y completa los valores.`,
    );
  }
  return value;
}

function flattenValidationErrors(errors: ValidationError[], parent = ''): string[] {
  const messages: string[] = [];

  for (const error of errors) {
    const path = parent ? `${parent}.${error.property}` : error.property;
    if (error.constraints?.whitelistValidation) {
      messages.push(`El campo ${path} no está permitido.`);
    } else if (error.constraints) {
      messages.push(...Object.values(error.constraints));
    }
    if (error.children?.length) {
      messages.push(...flattenValidationErrors(error.children, path));
    }
  }

  return messages;
}

function isAllowedOrigin(origin: string): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return false;
  }

  const host = url.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return true;
  }

  return (
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)
  );
}

async function bootstrap() {
  requireEnv('DATABASE_URL');
  const jwtSecret = requireEnv('JWT_SECRET');
  const adminPassword = requireEnv('DEMO_ADMIN_PASSWORD');
  const readerPassword = requireEnv('DEMO_READER_PASSWORD');

  if (jwtSecret.length < 16) {
    throw new Error('JWT_SECRET debe tener al menos 16 caracteres.');
  }

  if (adminPassword === readerPassword) {
    throw new Error('DEMO_ADMIN_PASSWORD y DEMO_READER_PASSWORD deben ser distintas.');
  }

  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origen no permitido'), false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const messages = flattenValidationErrors(errors);
        return new BadRequestException(messages.length ? messages : 'Los datos enviados no son válidos.');
      },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT?.trim() || '3000';
  await app.listen(port);
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'No se pudo iniciar el servidor.';
  console.error(message);
  process.exit(1);
});
