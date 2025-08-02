import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { UserAuthController } from './auth/user.auth.controller';
import { AdminAuthController } from './auth/admin.auth.controller';
import { InfluencerAuthController } from './auth/influencer.auth.controller';
import { SwaggerAuthTokenRoles } from './swagger.config';

export default function swaggerSetup(app: INestApplication, apiPrefix: string) {
  const configService = app.get(ConfigService);
  const port = configService.get('PORT', 3000);
  const logger = new Logger('Swagger');

  // Configure Swagger documentation only if enabled
  const enableSwagger = configService.get('ENABLE_SWAGGER') ?? false;
  //...
  if (!enableSwagger) return logger.warn('Swagger is disabled');

  const defaultValue = {
    title: 'Influencer Management Platform API',
    version: '1.0',
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  };

  const userDocConfig = new DocumentBuilder()
    .setTitle(defaultValue.title)
    .setDescription('API documentation for the user app')
    .setVersion(defaultValue.version)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
      },
      SwaggerAuthTokenRoles.USER_TOKEN, // This is the name you'll refer to in decorators
    )
    .addTag('Authentication', 'Authentication related endpoints')
    .build();

  const influencerSwaggerConfig = new DocumentBuilder()
    .setTitle('Influencer Management Platform API')
    .setDescription('API documentation for the Influencer app')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
      },
      SwaggerAuthTokenRoles.INFLUENCER_TOKEN, // This is the name you'll refer to in decorators
    )
    .build();

  const adminSwaggerConfig = new DocumentBuilder()
    .setTitle('Influencer Management Platform API')
    .setDescription('API documentation for the admin app')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
      },
      SwaggerAuthTokenRoles.ADMIN_TOKEN, // This is the name you'll refer to in decorators
    )
    .build();

  const userDoc = SwaggerModule.createDocument(app, userDocConfig);
  const influencerDoc = SwaggerModule.createDocument(app, influencerSwaggerConfig);
  const adminDoc = SwaggerModule.createDocument(app, adminSwaggerConfig);

  for (const key in userDoc.paths) if (!key.startsWith(`/${apiPrefix}/u/`)) delete userDoc.paths[key];
  for (const key in influencerDoc.paths) if (!key.startsWith(`/${apiPrefix}/in/`)) delete influencerDoc.paths[key];
  for (const key in adminDoc.paths) if (!key.startsWith(`/${apiPrefix}/a/`)) delete adminDoc.paths[key];

  SwaggerModule.setup(`${apiPrefix}/u`, app, userDoc, { swaggerOptions: defaultValue.swaggerOptions });
  SwaggerModule.setup(`${apiPrefix}/in`, app, influencerDoc, { swaggerOptions: defaultValue.swaggerOptions });
  SwaggerModule.setup(`${apiPrefix}/a`, app, adminDoc, { swaggerOptions: defaultValue.swaggerOptions });

  logger.log(`API Docs : http://localhost:${port}/${apiPrefix}/u`);
  logger.log(`API Docs : http://localhost:${port}/${apiPrefix}/in`);
  logger.log(`API Docs : http://localhost:${port}/${apiPrefix}/a`);

  // -----------------------------------

  const config = new DocumentBuilder()
    .setTitle('Influencer Management Platform API')
    .setDescription('API documentation for the Influencer Management Platform')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
      },
      'access-token', // This is the name you'll refer to in decorators
    )
    .addTag('Authentication', 'Authentication related endpoints')
    .addTag('User management', 'User management endpoints')
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

  logger.log(`API Documentation available at: http://localhost:${port}/api`);
}
