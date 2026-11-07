import 'reflect-metadata';
import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { config } from './common/config';

function aplanar(errores: ValidationError[], padre = ''): string[] {
  const m: string[] = [];
  for (const e of errores) {
    const ruta = padre ? `${padre}.${e.property}` : e.property;
    if (e.constraints?.whitelistValidation) m.push(`El campo ${ruta} no está permitido.`);
    else if (e.constraints) m.push(...Object.values(e.constraints));
    if (e.children?.length) m.push(...aplanar(e.children, ruta));
  }
  return m;
}

async function bootstrap() {
  const cfg = config();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: ['error', 'warn'] });
  app.set('trust proxy', 'loopback');
  app.disable('x-powered-by');
  app.useBodyParser('json', { limit: '1mb' });
  app.enableShutdownHooks();
  // CORS restringido a los orígenes configurados (APP_URL por defecto).
  app.enableCors({
    origin: (origen, cb) => cb(null, !origen || cfg.corsOrigenes.includes(origen.replace(/\/$/, ''))),
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  });
  app.use((_req: unknown, res: { setHeader: (k: string, v: string) => void }, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (e) => {
        const m = aplanar(e);
        return new BadRequestException(m.length ? m : 'Los datos enviados no son válidos.');
      },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.listen(cfg.puerto, '0.0.0.0');
  console.log(`TrazaGen API escuchando en http://localhost:${cfg.puerto}/api · motor AFIS en ${cfg.afisUrl}`);
}

bootstrap().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : 'No se pudo iniciar el servidor.');
  process.exit(1);
});
