import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/user/user.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  // Implement authentication logic
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject('JWT_ACCESS_SERVICE') private readonly jwtAccessService: JwtService,
    @Inject('JWT_REFRESH_SERVICE') private readonly jwtRefreshService: JwtService,
  ) {}

  async getUserByEmailOrPhoneForPassword(username: string): Promise<UserDocument | null> {
    return (await this.userModel.findOne({ $or: [{ email: username }, { phoneNumber: username }] }))?.toJSON?.() || null;
  }

  async comparePassword(plainPassword: string, hashedPassword: string) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  async createPasswordHash(password: string) {
    return await bcrypt.hash(password, 10);
  }

  async generateJwtAccessToken(user: User) {
    return this.jwtAccessService.sign({ sub: user._id, role: user.role, email: user.email });
  }

  async generateJwtRefreshToken(user: User) {
    return this.jwtRefreshService.sign({ sub: user._id, role: user.role, email: user.email });
  }

  async verifyJwtAccessToken(token: string) {
    try {
      return this.jwtAccessService.verify(token);
    } catch (error) {
      return null;
    }
  }

  async verifyJwtRefreshToken(token: string) {
    try {
      return this.jwtRefreshService.verify(token);
    } catch (error) {
      return null;
    }
  }
}
