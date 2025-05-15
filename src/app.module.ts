import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { CategoryModule } from './category/category.module';
import { NotificationModule } from './notification/notification.module';
import { validate } from './config/env.validation';
import { S3Module } from './common/s3/s3.module';

/**
 * Root application module
 * This module serves as the root of the application and is responsible for:
 * - Loading environment variables
 * - Configuring the database connection
 * - Importing and configuring all feature modules
 * - Setting up global providers and controllers
 */
@Module({
  imports: [
    // Load and validate environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      envFilePath: ['.env', '.env.dev', '.env.production'],
      // load: [() => ({
      //   ENABLE_SWAGGER: process.env.ENABLE_SWAGGER === 'true',
      // })],
      cache: true,
    }),

    // Configure MongoDB connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        // useNewUrlParser: true,
        // useUnifiedTopology: true,
        // Additional MongoDB options
        autoIndex: configService.get('NODE_ENV') === 'dev',
        maxPoolSize: 10,
        minPoolSize: 5,
        socketTimeoutMS: 45000,
        family: 4,
      }),
      inject: [ConfigService],
    }),

    // Feature modules
    AuthModule,      // Authentication and authorization
    UserModule,      // User management
    CategoryModule,  // Category management
    NotificationModule, // Notification system
    S3Module
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
