import { Inject, Injectable } from '@nestjs/common';
import { User } from 'src/user/user.schema';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  // Implement authentication logic
  constructor(
    @Inject('JWT_ACCESS_SERVICE') private readonly jwtAccessService: JwtService,
    @Inject('JWT_REFRESH_SERVICE') private readonly jwtRefreshService: JwtService,
  ) {}

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
