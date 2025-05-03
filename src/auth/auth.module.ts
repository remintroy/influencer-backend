import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/user/user.schema';
import { AuthController } from './auth.controller';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationModule } from 'src/notification/notification.module';
import { UserService } from 'src/user/user.service';

@Module({
  imports: [NotificationModule, MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  controllers: [AuthController],
  providers: [
    AuthService,
    UserService,
    {
      provide: 'JWT_ACCESS_SERVICE',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return new JwtService({ secret: configService.get('ACCESS_TOKEN_SECRET'), signOptions: { expiresIn: '15m' } });
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
})
export class AuthModule {}
