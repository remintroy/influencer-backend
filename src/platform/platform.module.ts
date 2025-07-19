import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Platform, PlatformSchema } from './schemas/platform.schema';
import { PlatformService } from './platform.service';
import { PlatformController } from './platform.controller';
import { User, UserSchema } from 'src/user/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Platform.name, schema: PlatformSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [PlatformService],
  controllers: [PlatformController],
  exports: [PlatformService],
})
export class PlatformModule {}
