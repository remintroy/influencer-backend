import { BadRequestException, Body, Controller, Post, Res, UnauthorizedException } from '@nestjs/common';
import { SigninDto } from './dto/signin.dto';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { SignupUserDto } from './dto/signup.user.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signin')
  @ApiBody({ type: SigninDto })
  async signIn(@Body() credentials: SigninDto, @Res({ passthrough: true }) res: Response) {
    // Validate sign-in request
    if (!credentials?.password || !credentials?.username) {
      throw new BadRequestException('Missing credentials');
    }

    // Implement user sign-in logic
    const user = await this.authService.getUserByEmailOrPhoneForPassword(credentials.username);

    if (!user || !user.password) {
      // User not found or password not provided
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!(await this.authService.comparePassword(credentials.password, user.password))) {
      // Password comparison failed
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.authService.generateJwtAccessToken(user);
    const refreshToken = await this.authService.generateJwtRefreshToken(user);

    delete user.password; // Don't return password in the response
    delete user.meta;

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: true, // Use true in production
      sameSite: 'none',
      path: '/api/auth/refresh', // Optional: restrict path where cookie is sent
      maxAge: 365 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { ...user, accessToken, refreshToken };
  }

  @Post('signin')
  async signUp(@Body() reqData: SignupUserDto, @Res({ passthrough: true }) res: Response) {
    // Validate sign-in request

    if (!reqData?.email || !reqData?.password) {
      // Minimum requirements
      throw new BadRequestException('Email & Password is required');
    }
  }
}
