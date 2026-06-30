import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { json } from 'body-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const cookieParserFn = (cookieParser as any).default || cookieParser;
  app.use(cookieParserFn());

  // Capture raw body buffer for store webhook signature verification
  app.use(
    json({
      verify: (req: unknown, _res: unknown, buf: Buffer) => {
        const request = req as { originalUrl?: string; rawBody?: Buffer };
        if (request.originalUrl && request.originalUrl.includes('/webhooks')) {
          request.rawBody = buf;
        }
      },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  // Enable CORS for frontend Remix SSR / client requests
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
void bootstrap();
