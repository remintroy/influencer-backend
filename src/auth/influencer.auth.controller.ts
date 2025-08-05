import { Body, Controller, Post, Res, Req, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Public } from 'src/common/decorators/public.decorator';
import { UserRole } from 'src/user/schemas/user.schema';
import { AuthService } from './auth.service';
import { SigninDto } from './dto/signin.dto';
import { Roles } from 'src/common/decorators/role.decorator';
import { SwaggerAuthTokenRoles } from 'src/swagger.config';

@ApiTags('Authentication')
@Controller('/in/auth')
export class InfluencerAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signin')
  @Public()
  @ApiOperation({ summary: 'Sign in with email or phone' })
  @ApiBody({ type: SigninDto })
  async signIn(@Body() credentials: SigninDto, @Res({ passthrough: true }) res: Response, @Req() req: Request) {
    const userAgent = req.headers['user-agent'];
    return this.authService.signIn(credentials, res, userAgent);
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
  @ApiBearerAuth(SwaggerAuthTokenRoles.INFLUENCER_TOKEN)
  @ApiOperation({ summary: 'Get Active Sessions', description: 'Retrieves all active sessions for the authenticated user.' })
  @Roles(UserRole.INFLUENCER)
  async getActiveSessions(@Req() req: Request) {
    return this.authService.getUserActiveSessions(req?.user?._id as string);
  }

  @Get('logout')
  @ApiBearerAuth(SwaggerAuthTokenRoles.INFLUENCER_TOKEN)
  @ApiOperation({ summary: 'Logout', description: 'Revokes refresh token and logs the user out.' })
  @Roles(UserRole.INFLUENCER)
  async logout(@Req() req: Request) {
    const refreshToken = req.cookies?.refresh_token;
    return this.authService.logout(refreshToken);
  }
}
