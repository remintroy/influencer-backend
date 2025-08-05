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
import { GoogleLoginDto } from './dto/google-login.dto';
import { ResetPasswordWithOtpDto } from './dto/reset-password-with-otp.dto';
import { ForgetPasswordDto } from './dto/forget-password.dto';
import { SwaggerAuthTokenRoles } from 'src/swagger.config';

@ApiTags('Authentication')
@Controller('/u/auth')
export class UserAuthController {
  constructor(private readonly authService: AuthService) {}

  // ──────────────── Public Auth Endpoints ────────────────

  @Post('google-auth')
  @Public()
  @ApiOperation({ summary: 'Google OAuth Login' })
  @ApiBody({ type: GoogleLoginDto })
  async googleLogin(@Body() reqData: GoogleLoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const idToken = reqData.idToken;
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

  @Post('forget-password')
  @Public()
  @ApiBody({ type: ForgetPasswordDto })
  @ApiOperation({
    summary: 'Send OTP for password reset',
    description: "Sends an OTP to the user's registered phone number for password reset.",
  })
  async forgetPasswordSendOtp(@Req() req: Request, @Body() reqData: ForgetPasswordDto) {
    const userAgent = req.headers['user-agent'];
    return this.authService.forgetPasswordSendOtp({ ...reqData, userAgent: userAgent! });
  }

  @Post('reset-password-with-otp')
  @ApiBody({ type: ResetPasswordWithOtpDto })
  @Public()
  @ApiOperation({
    summary: 'Reset password with OTP',
    description: 'Allows a user to reset their password using a valid OTP, new password, and userId.',
  })
  async resetPasswordWithOtp(
    @Body() reqData: ResetPasswordWithOtpDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const userAgent = req.headers['user-agent'];
    return this.authService.resetPasswordWithOtp({ ...reqData, res, userAgent });
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
  @ApiOperation({ summary: 'Refresh Access Token', description: 'Generates a new access token using a valid refresh token.' })
  async refreshAccessToken(@Req() req: Request, @Body() reqData: { refreshToken?: string }) {
    const refreshToken = req.cookies?.refresh_token || reqData?.refreshToken;
    return this.authService.generateAccessTokenFromRefreshToken(refreshToken);
  }

  // ──────────────── Protected Auth Endpoints ────────────────

  @Get('sessions')
  @ApiBearerAuth(SwaggerAuthTokenRoles.USER_TOKEN)
  @Roles(UserRole.USER)
  @ApiOperation({ summary: 'Get Active Sessions', description: 'Retrieves all active sessions for the authenticated user.' })
  async getActiveSessions(@Req() req: Request) {
    return this.authService.getUserActiveSessions(req?.user?._id as string);
  }

  @Get('logout')
  @ApiBearerAuth(SwaggerAuthTokenRoles.USER_TOKEN)
  @Roles(UserRole.USER)
  @ApiOperation({ summary: 'Logout', description: 'Revokes refresh token and logs the user out.' })
  async logout(@Req() req: Request) {
    const refreshToken = req.cookies?.refresh_token;
    return this.authService.logout(refreshToken);
  }
}
