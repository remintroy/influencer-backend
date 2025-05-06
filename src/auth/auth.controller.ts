import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Param,
  Res,
  UnauthorizedException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SigninDto } from './dto/signin.dto';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SignupUserDto } from './dto/signup.user.dto';
import { UserRole } from 'src/user/user.schema';
import { SmsService } from 'src/notification/sms/sms.service';
import { EmailService } from 'src/notification/email/email.service';
import { UserService } from 'src/user/user.service';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { Roles } from 'src/common/decorators/role.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly smsService: SmsService,
    private readonly emailService: EmailService,
  ) {}

  @Post('signin-common')
  @Public()
  @ApiOperation({
    summary: 'Sign in user (email or phone)',
    description: 'Allows a users and influencers to sign in using either email or phone and password.',
  })
  @ApiBody({ type: SigninDto })
  async signIn(@Body() credentials: SigninDto, @Res({ passthrough: true }) res: Response) {
    // Validate sign-in request
    if (!credentials?.password || !credentials?.username) {
      throw new BadRequestException('Missing credentials');
    }

    // Implement user sign-in logic
    const user = await this.userService.getUserByEmailOrPhoneSudo(credentials.username);

    if (!user || !user.password) {
      // User not found or password not provided
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!(await this.authService.comparePassword(credentials.password, user.password))) {
      // Password comparison failed
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user?.role == UserRole.USER && !user?.meta?.isVerified) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const meta = { ...user?.meta };

      meta.verificationCode = otp;
      meta.verificationCodeExpires = verificationCodeExpires;

      await this.userService.updateUser(user?._id + '', { meta });

      if (user?.phoneNumber) await this.smsService.sendOtp(user.phoneNumber!, otp);
      if (user?.email) await this.emailService.sendOtp(user?.email!, otp);

      throw new UnauthorizedException('Account not verified - A OTP has been send to your register email/phoneNumber');
    }

    delete user.password; // Don't return password in the response
    delete user.meta;

    const accessToken = await this.authService.generateJwtAccessToken(user);
    const refreshToken = await this.authService.generateJwtRefreshToken(user);

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: true, // Use true in production
      sameSite: 'none',
      path: '/api/auth/refresh', // Optional: restrict path where cookie is sent
      maxAge: 365 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { ...user, accessToken, refreshToken };
  }

  @Post('signup-user')
  @Public()
  @ApiBody({ type: SignupUserDto })
  @ApiOperation({ summary: 'User Sign-up', description: 'Registers a new user and sends OTP for verification.' })
  async signUp(@Body() reqData: SignupUserDto, @Res({ passthrough: true }) res: Response) {
    // Validate sign-in request

    if (!reqData?.email || !reqData?.password) {
      // Minimum requirements
      throw new BadRequestException('Email & Password is required');
    }

    const existingUser = await this.userService.getUserByEmailOrPhoneSudo('', {
      email: reqData?.email,
      phoneNumber: reqData?.phoneNumber,
    });

    if (reqData?.email == existingUser?.email) throw new BadRequestException("Can't create account with this email");
    if (reqData?.phoneNumber == existingUser?.phoneNumber)
      throw new BadRequestException("Can't create account with this phone number");
    if (existingUser) throw new BadRequestException('User already exits');

    const password = await this.authService.createPasswordHash(reqData?.password);
    const newUser = await this.userService.createUserSudo({
      email: reqData?.email,
      role: UserRole.USER,
      phoneNumber: reqData?.phoneNumber,
      profilePicture: reqData?.profilePicture,
      password,
    });

    delete newUser.password; // Don't return password in the response

    if (newUser?.role == UserRole.USER) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const meta = { ...newUser?.meta };

      meta.verificationCode = otp;
      meta.verificationCodeExpires = verificationCodeExpires;

      console.log(meta);

      await this.userService.updateUser(newUser?._id + '', { meta });

      if (newUser?.phoneNumber) await this.smsService.sendOtp(newUser.phoneNumber!, otp);
      if (newUser?.email) await this.emailService.sendOtp(newUser?.email!, otp);

      return {
        success: true,
        data: { userId: newUser?._id },
        message: 'User Created successfully - A OTP has been send to your register email/phoneNumber',
      };
    }

    const accessToken = await this.authService.generateJwtAccessToken(newUser);
    const refreshToken = await this.authService.generateJwtRefreshToken(newUser);

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: true, // Use true in production
      sameSite: 'none',
      path: '/api/auth/refresh', // Optional: restrict path where cookie is sent
      maxAge: 365 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { ...newUser, accessToken, refreshToken };
  }

  @Post('verify-otp/:userId')
  @Public()
  @ApiOperation({ summary: 'Verify OTP', description: 'Verifies the OTP sent to the user during registration.' })
  @ApiBody({ type: VerifyOtpDto })
  async verifyOtp(@Param('userId') userId: string, @Body() reqData: VerifyOtpDto, @Res({ passthrough: true }) res: Response) {
    const otp = reqData?.otp;

    if (!otp) throw new BadRequestException('Otp is required');

    const userData = await this.userService.getUserByIdSudo(userId);

    if (!userData) throw new NotFoundException('User not found');

    if (userData?.meta?.isVerified) throw new UnauthorizedException('User already verified');

    if (otp != userData?.meta?.verificationCode || new Date(userData?.meta?.verificationCodeExpires as Date) < new Date()) {
      throw new UnauthorizedException('Invalid Otp or Otp expired');
    }

    const meta = { ...userData?.meta };
    meta.isVerified = true;
    meta.verificationCode = '';

    const verifiedUser = await this.userService.updateUser(userId, { meta });

    delete verifiedUser?.password;
    delete verifiedUser?.meta;

    const accessToken = await this.authService.generateJwtAccessToken(userData);
    const refreshToken = await this.authService.generateJwtRefreshToken(userData);

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: true, // Use true in production
      sameSite: 'none',
      path: '/api/auth/refresh', // Optional: restrict path where cookie is sent
      maxAge: 365 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { ...verifiedUser, accessToken, refreshToken };
  }

  @ApiBearerAuth('access-token')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Send credentials to influencer (Admin only)',
    description: 'Admin only: Sends temporary login credentials to influencer via email.',
  })
  @Post('influencer/send-credentials/:userId')
  async sendCredentialsToInfluencer(@Param('userId') userId: string) {
    const user = await this.userService.getInfluencerById(userId);

    if (!user) throw new NotFoundException('User not found');

    // Generate a random password for the influencer
    const password = Math.random().toString(36).slice(-8);

    // Hash the password before saving
    const hashedPassword = await this.authService.createPasswordHash(password);

    const updated = await this.userService.updateUserSudo(userId, {
      password: hashedPassword,
      meta: { ...user?.meta, welcomeMailWithPasswordSent: true, welcomeMailWithPasswordSentAt: new Date() },
    });

    if (!updated) throw new InternalServerErrorException('Failed to update user');

    // Send influencer credentials via email or SMS
    this.emailService.sendCredentialsEmail(user.email!, password);

    return { success: true, message: 'Credentials sent successfully' };
  }
}
