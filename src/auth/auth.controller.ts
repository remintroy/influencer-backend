import { Body, Controller, Post, Param, Res, Req, UnauthorizedException, Get } from '@nestjs/common';
import { SigninDto } from './dto/signin.dto';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SignupUserDto } from './dto/signup.user.dto';
import { UserRole } from 'src/user/schemas/user.schema';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { Roles } from 'src/common/decorators/role.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signin-common')
  @Public()
  @ApiOperation({
    summary: 'Sign in user (email or phone)',
    description: 'Allows a users and influencers to sign in using either email or phone and password.',
  })
  @ApiBody({ type: SigninDto })
  async signIn(@Body() credentials: SigninDto, @Res({ passthrough: true }) res: Response, @Req() req: Request) {
    const userAgent = req.headers['user-agent'];
    return this.authService.signIn(credentials, res, userAgent);
  }

  @Post('signup-user')
  @Public()
  @ApiBody({ type: SignupUserDto })
  @ApiOperation({ summary: 'User Sign-up', description: 'Registers a new user and sends OTP for verification.' })
  async signUp(@Body() reqData: SignupUserDto, @Res({ passthrough: true }) res: Response, @Req() req: Request) {
    const userAgent = req.headers['user-agent'];
    return this.authService.signUp(reqData, res, userAgent);
  }

  @Post('verify-otp/:userId')
  @Public()
  @ApiOperation({ summary: 'Verify OTP', description: 'Verifies the OTP sent to the user during registration.' })
  @ApiBody({ type: VerifyOtpDto })
  async verifyOtp(
    @Param('userId') userId: string,
    @Body() reqData: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const userAgent = req.headers['user-agent'];
    return this.authService.verifyOtp(userId, reqData, res, userAgent);
  }

  @ApiBearerAuth('access-token')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Send credentials to influencer (Admin only)',
    description: 'Admin only: Sends temporary login credentials to influencer via email.',
  })
  @Post('influencer/send-credentials/:userId')
  async sendCredentialsToInfluencer(@Param('userId') userId: string) {
    return this.authService.sendCredentialsToInfluencer(userId);
  }

  @ApiBearerAuth('access-token')
  @Get('active-sessions')
  @ApiOperation({ summary: 'Get active sessions', description: 'Returns all active sessions for the authenticated user.' })
  async getAllActiveSessions(@Req() req: Request) {
    return await this.authService.getUserActiveSessions(req?.user?._id as string);
  }

  @ApiBearerAuth('access-token')
  @Get('logout')
  @ApiOperation({ summary: 'Logout', description: 'Revokes the refresh token and logs the user out.' })
  async logout(@Req() req: Request) {
    const refreshToken = req.cookies?.refresh_token;
    // const accessToken = req.headers['authorization']?.split(' ')?.[1];
    this.authService.logout(refreshToken);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token', description: 'Refreshes the access token using the provided refresh token.' })
  async verifyRefreshToken(@Req() req: Request, @Body() reqData: { refreshToken?: string }) {
    const refreshToken = req.cookies?.refresh_token || reqData?.refreshToken;
    return await this.authService.generateAccessTokenFromRefreshToken(refreshToken);
  }
}
