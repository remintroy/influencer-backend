import { Body, Controller, Post, Param, Res, Req, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Public } from 'src/common/decorators/public.decorator';
import { Roles } from 'src/common/decorators/role.decorator';
import { UserRole } from 'src/user/schemas/user.schema';
import { AuthService } from './auth.service';
import { SigninDto } from './dto/signin.dto';
import { SwaggerAuthTokenRoles } from 'src/swagger.config';

@ApiTags('Auth Admin')
@Controller('/a/auth')
export class AdminAuthController {
  constructor(private readonly authService: AuthService) {}

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

  @Get('sessions')
  @ApiBearerAuth(SwaggerAuthTokenRoles.ADMIN_TOKEN)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get Active Sessions',
    description: 'Retrieves all active sessions for the authenticated user.',
  })
  async getActiveSessions(@Req() req: Request) {
    return this.authService.getUserActiveSessions(req?.user?._id as string);
  }

  @Post('logout')
  @ApiBearerAuth(SwaggerAuthTokenRoles.ADMIN_TOKEN)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Logout',
    description: 'Revokes refresh token and logs the user out.',
  })
  async logout(@Req() req: Request) {
    const refreshToken = req.cookies?.refresh_token;
    return this.authService.logout(refreshToken);
  }

  @Post('influencer/:userId/send-credentials')
  @ApiBearerAuth(SwaggerAuthTokenRoles.ADMIN_TOKEN)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Send credentials to influencer',
    description: 'Sends temporary login credentials to an influencer via email.',
  })
  async sendCredentialsToInfluencer(@Param('userId') userId: string) {
    return this.authService.sendCredentialsToInfluencer(userId);
  }
}
