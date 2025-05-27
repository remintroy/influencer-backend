import { Module } from '@nestjs/common';
import { CollaborationController } from './collaboration.controller';
import { CollaborationService } from './collaboration.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Collaboration, CollaborationSchema } from './schemas/collaboration.schema';
import { UserService } from 'src/user/user.service';
import { User, UserSchema } from 'src/user/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Collaboration.name, schema: CollaborationSchema }]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [CollaborationController],
  providers: [CollaborationService, UserService],
})
export class CollaborationModule {}
