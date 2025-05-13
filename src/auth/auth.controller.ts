import { Body, Controller, Post, Param, Res, Req, Get } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { SigninDto } from './dto/signin.dto';
import { SignupUserDto } from './dto/signup.user.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

import { Public } from 'src/common/decorators/public.decorator';
import { Roles } from 'src/common/decorators/role.decorator';
import { UserRole } from 'src/user/schemas/user.schema';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ──────────────── Public Auth Endpoints ────────────────

  @Post('google-auth')
  @Public()
  async googleLogin(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const idToken = req.body.idToken;
    const userAgent = req.headers['user-agent'];
    return this.authService.googleAuth(idToken, res, userAgent);
  }

  @Post('signin')
  @Public()
  @ApiOperation({
    summary: 'Sign in with email or phone',
    description: 'Allows a user or influencer to sign in using email or phone number and password.',
  })
  @ApiBody({ type: SigninDto })
  async signIn(@Body() credentials: SigninDto, @Res({ passthrough: true }) res: Response, @Req() req: Request) {
    const userAgent = req.headers['user-agent'];
    return this.authService.signIn(credentials, res, userAgent);
  }

  @Post('signup')
  @Public()
  @ApiBody({ type: SignupUserDto })
  @ApiOperation({
    summary: 'User Sign Up',
    description: 'Registers a new user and sends OTP for verification.',
  })
  async signUp(@Body() reqData: SignupUserDto, @Res({ passthrough: true }) res: Response, @Req() req: Request) {
    const userAgent = req.headers['user-agent'];
    return this.authService.signUp(reqData, res, userAgent);
  }

  @Post('verify-otp/:userId')
  @Public()
  @ApiBody({ type: VerifyOtpDto })
  @ApiOperation({
    summary: 'Verify OTP',
    description: 'Verifies OTP sent during registration.',
  })
  async verifyOtp(
    @Param('userId') userId: string,
    @Body() reqData: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const userAgent = req.headers['user-agent'];
    return this.authService.verifyOtp(userId, reqData, res, userAgent);
  }

  @Post('refresh-token')
  @Public()
  @ApiOperation({
    summary: 'Refresh Access Token',
    description: 'Generates a new access token using a valid refresh token.',
  })
  async refreshAccessToken(@Req() req: Request, @Body() reqData: { refreshToken?: string }) {
    const refreshToken = req.cookies?.refresh_token || reqData?.refreshToken;
    return this.authService.generateAccessTokenFromRefreshToken(refreshToken);
  }

  // ──────────────── Protected Auth Endpoints ────────────────

  @Get('sessions')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get Active Sessions',
    description: 'Retrieves all active sessions for the authenticated user.',
  })
  async getActiveSessions(@Req() req: Request) {
    return this.authService.getUserActiveSessions(req?.user?._id as string);
  }

  @Get('logout')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Logout',
    description: 'Revokes refresh token and logs the user out.',
  })
  async logout(@Req() req: Request) {
    const refreshToken = req.cookies?.refresh_token;
    return this.authService.logout(refreshToken);
  }

  // ──────────────── Admin-Specific Endpoints ────────────────

  @Post('admin/influencer/:userId/send-credentials')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Send credentials to influencer',
    description: 'ADMIN ONLY: Sends temporary login credentials to an influencer via email.',
  })
  async sendCredentialsToInfluencer(@Param('userId') userId: string) {
    return this.authService.sendCredentialsToInfluencer(userId);
  }
}
