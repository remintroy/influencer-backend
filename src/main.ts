import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { RolesGuard } from './common/guards/role.guard';
import * as cookieParser from 'cookie-parser';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

/**
 * Bootstrap the application
 * This is the entry point of the application where we configure global middleware,
 * security features, and API documentation.
 */
async function bootstrap() {
  // Create the NestJS application instance
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable CORS with specific options
  app.enableCors({
    origin: configService.get('CORS_ORIGIN', '*'),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  // Apply global security middleware
  app.use(helmet()); // Security headers
  app.use(compression()); // Response compression
  app.use(cookieParser())

  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector), new RolesGuard(reflector));

  // Apply global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      transform: true, // Transform payloads to DTO instances
      forbidNonWhitelisted: true, // Throw errors if non-whitelisted properties are present
      transformOptions: {
        enableImplicitConversion: true, // Enable implicit conversion of primitive types 
      },
    }),
  );

  // Apply global filters and interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Configure global prefix
  const apiPrefix = configService.get('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  // Configure Swagger documentation only if enabled
  const enableSwagger = configService.get('ENABLE_SWAGGER') ?? false;

  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Influencer Management Platform API')
      .setDescription('API documentation for the Influencer Management Platform')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Authentication', 'Authentication related endpoints')
      .addTag('Users', 'User management endpoints')
      .addTag('Categories', 'Category management endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
  }

  // Start the server
  const port = configService.get('PORT', 3000);
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  if (enableSwagger) {
    console.log(`API Documentation available at: http://localhost:${port}/api`);
  }
}

bootstrap();
