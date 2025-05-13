import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { AuthController } from './auth.controller';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationModule } from 'src/notification/notification.module';
import { UserService } from 'src/user/user.service';
import { RefreshToken, RefreshTokenSchema } from './schemas/refresh-token.schema';
import { OptSchema, Otp } from './schemas/otp.schema';

@Module({
  imports: [
    NotificationModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([{ name: RefreshToken.name, schema: RefreshTokenSchema }]),
    MongooseModule.forFeature([{ name: Otp.name, schema: OptSchema }]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UserService,
    {
      provide: 'JWT_ACCESS_SERVICE',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return new JwtService({
          secret: configService.get('ACCESS_TOKEN_SECRET'),
          signOptions: {
            expiresIn: configService.get('NODE_ENV') == 'dev' ? configService.get('ACCESS_TOKEN_EXPIRES_IN') : '365d',
          },
        });
      },
    },
    {
      provide: 'JWT_REFRESH_SERVICE',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return new JwtService({ secret: configService.get('REFRESH_TOKEN_SECRET'), signOptions: { expiresIn: '365d' } });
      },
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
