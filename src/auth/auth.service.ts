import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { User, UserRole } from 'src/user/schemas/user.schema';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { SigninDto } from './dto/signin.dto';
import { SignupUserDto } from './dto/signup.user.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { UserService } from 'src/user/user.service';
import { SmsService } from 'src/notification/sms/sms.service';
import { EmailService } from 'src/notification/email/email.service';
import { Response } from 'express';
import { RefreshToken, RefreshTokenDocument } from './schemas/refresh-token.schema';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Otp, OtpDocument } from './schemas/otp.schema';
import { GoogleAuthService } from './google-auth/google-auth.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject('JWT_ACCESS_SERVICE') private readonly jwtAccessService: JwtService,
    @Inject('JWT_REFRESH_SERVICE') private readonly jwtRefreshService: JwtService,
    private readonly userService: UserService,
    private readonly smsService: SmsService,
    private readonly emailService: EmailService,
    private readonly googleAuthService: GoogleAuthService,
    @InjectModel(RefreshToken.name) private readonly refreshTokenModel: Model<RefreshTokenDocument>,
    @InjectModel(Otp.name) private readonly otpModel: Model<OtpDocument>,
  ) {}

  private setRefreshTokenCookie(res: Response, refreshToken: string) {
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/api/v1/auth',
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });
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

  async generateJwtRefreshToken(user: User, options?: { userAgent?: string; ipAddress?: string; deviceInfo?: string }) {
    const token = await this.jwtRefreshService.sign({ sub: user._id, role: user.role, email: user.email });
    this.refreshTokenModel.create({
      token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      userId: user._id,
      deviceInfo: options?.userAgent,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
    });
    return token;
  }

  async generateOtp(userId: string, options?: { userAgent?: string; ipAddress?: string }): Promise<string> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    this.otpModel.create({ otp, expiresAt, userId, userAgent: options?.userAgent, ipAddress: options?.ipAddress });
    return otp;
  }

  async verifyJwtAccessToken(token: string) {
    try {
      const payload = await this.jwtAccessService.verify(token);
      return { userId: payload?.sub, role: payload.role, email: payload.email };
    } catch (error) {
      return null;
    }
  }

  async verifyJwtRefreshToken(token: string) {
    try {
      const payload = await this.jwtRefreshService.verify(token);
      return { userId: payload?.sub, role: payload.role, email: payload.email };
    } catch (error) {
      return null;
    }
  }

  // Main

  async googleAuth(idToken: string, res: Response, userAgent?: string) {
    if (!idToken) throw new BadRequestException('Id token is required');
    const { email, name, sub: googleId, picture } = await this.googleAuthService.verifyGoogleToken(idToken);

    let userInDb = await this.userService.getUserByEmailOrPhoneSudo('', { email });

    if (!userInDb) {
      userInDb = await this.userService.createUserSudo({
        email: email as string,
        name,
        googleId,
        profileImage: picture,
        role: UserRole.USER,
      });
      throw new UnauthorizedException('User not found');
    }

    if (userInDb?.googleId !== googleId) {
      throw new UnauthorizedException('Google account already linked with another user');
    }

    if (userInDb && !userInDb?.googleId) {
      await this.userService.updateUser(userInDb?._id as string, { googleId: userInDb?.googleId });
    }

    const accessToken = await this.generateJwtAccessToken(userInDb);
    const refreshToken = await this.generateJwtRefreshToken(userInDb, { userAgent });

    this.setRefreshTokenCookie(res, refreshToken);

    delete userInDb.password;
    delete userInDb.meta;

    return { ...userInDb, accessToken, refreshToken };
  }

  async signIn(credentials: SigninDto, res: Response, userAgent?: string) {
    if (!credentials?.password || !credentials?.username) {
      throw new BadRequestException('Missing credentials');
    }

    const user = await this.userService.getUserByEmailOrPhoneSudo(credentials.username);

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!(await this.comparePassword(credentials.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user?.role == UserRole.USER && !user?.meta?.isVerified) {
      const otp = await this.generateOtp(user?._id as string, { userAgent });

      await this.userService.updateUser(user?._id + '', { meta: { welcomeMailWithPasswordSent: true } });

      if (user?.phoneNumber) await this.smsService.sendOtp(user.phoneNumber!, otp);
      if (user?.email) await this.emailService.sendOtp(user?.email!, otp);

      throw new UnauthorizedException({
        error: true,
        data: { userId: user?._id },
        message: 'Account not verified - A OTP has been send to your register email/phoneNumber',
      });
    }

    delete user.password;
    delete user.meta;

    if (!user._id) {
      throw new Error('User ID is undefined');
    }

    const accessToken = await this.generateJwtAccessToken(user);
    const refreshToken = await this.generateJwtRefreshToken(user, {
      userAgent,
      ipAddress: credentials.ipAddress,
      deviceInfo: credentials.deviceInfo,
    });

    this.setRefreshTokenCookie(res, refreshToken);

    return { ...user, accessToken, refreshToken };
  }

  async signUp(reqData: SignupUserDto, res: Response, userAgent?: string) {
    if (!reqData?.email || !reqData?.password) {
      throw new BadRequestException('Email & Password is required');
    }

    const existingUser = await this.userService.getUserByEmailOrPhoneSudo('', {
      email: reqData?.email,
      phoneNumber: reqData?.phoneNumber,
    });

    if (reqData?.email && reqData?.email == existingUser?.email) {
      throw new BadRequestException("Can't create account with this email");
    }
    if (reqData?.phoneNumber && reqData?.phoneNumber == existingUser?.phoneNumber) {
      throw new BadRequestException("Can't create account with this phone number");
    }
    if (existingUser) throw new BadRequestException('User already exits');

    const password = await this.createPasswordHash(reqData?.password);
    const newUser = await this.userService.createUserSudo({
      email: reqData?.email,
      role: UserRole.USER,
      phoneNumber: reqData?.phoneNumber,
      profileImage: reqData?.profileImage,
      password,
    });

    delete newUser.password;

    if (newUser?.role == UserRole.USER) {
      const otp = await this.generateOtp(newUser?._id as string, { userAgent });

      await this.userService.updateUser(newUser?._id + '', { meta: { welcomeMailWithPasswordSent: true } });

      if (newUser?.phoneNumber) await this.smsService.sendOtp(newUser.phoneNumber!, otp);
      if (newUser?.email) await this.emailService.sendOtp(newUser?.email!, otp);

      return {
        success: true,
        data: { userId: newUser?._id },
        message: 'User Created successfully - A OTP has been send to your register email/phoneNumber',
      };
    }

    if (!newUser._id) {
      throw new Error('User ID is undefined');
    }

    const accessToken = await this.generateJwtAccessToken(newUser);
    const refreshToken = await this.generateJwtRefreshToken(newUser, {
      userAgent,
      ipAddress: reqData?.ipAddress,
      deviceInfo: reqData?.deviceInfo,
    });

    this.setRefreshTokenCookie(res, refreshToken);

    return { ...newUser, accessToken, refreshToken };
  }

  async verifyOtp(userId: string, reqData: VerifyOtpDto, res: Response, userAgent?: string) {
    const otp = reqData?.otp;

    if (!otp) throw new BadRequestException('Otp is required');

    const userData = await this.userService.getUserByIdSudo(userId);

    if (!userData) throw new NotFoundException('User not found');

    if (userData?.meta?.isVerified) throw new UnauthorizedException('User already verified');

    const optData = await this.otpModel.findOne({ userId: userData?._id, otp });

    if (!optData || new Date(optData?.expiresAt as Date) < new Date()) {
      throw new UnauthorizedException('Invalid Otp or Otp expired');
    }

    const verifiedUser = await this.userService.updateUser(userId, { meta: { isVerified: true } });

    if (!userData._id) {
      throw new Error('User ID is undefined');
    }

    await this.otpModel.deleteOne({ userId: userData?._id, otp });

    const accessToken = await this.generateJwtAccessToken(userData);
    const refreshToken = await this.generateJwtRefreshToken(userData, {
      userAgent,
      ipAddress: reqData?.ipAddress,
      deviceInfo: reqData?.deviceInfo,
    });

    this.setRefreshTokenCookie(res, refreshToken);

    return { ...verifiedUser, accessToken, refreshToken };
  }

  async sendCredentialsToInfluencer(userId: string) {
    const user = await this.userService.getInfluencerById(userId);

    if (!user) throw new NotFoundException('User not found');

    const password = Math.random().toString(36).slice(-8);
    const hashedPassword = await this.createPasswordHash(password);

    const updated = await this.userService.updateUserSudo(userId, {
      password: hashedPassword,
      meta: { ...user?.meta, welcomeMailWithPasswordSent: true, welcomeMailWithPasswordSentAt: new Date() },
    });

    if (!updated) throw new Error('Failed to update user');

    await this.emailService.sendCredentialsEmail(user.email!, password);

    return { success: true, message: 'Credentials sent successfully' };
  }

  async generateAccessTokenFromRefreshToken(refreshToken: string) {
    if (!refreshToken) throw new UnauthorizedException('Refresh token is required');

    const decodedToken = await this.verifyJwtRefreshToken(refreshToken);

    if (!decodedToken) throw new UnauthorizedException('Invalid refresh token');

    const storedToken = await this.refreshTokenModel.findOne({ token: refreshToken });

    if (!storedToken) throw new UnauthorizedException('Invalid refresh token');
    if (storedToken.isRevoked) throw new UnauthorizedException('Refresh token has been revoked');
    if (storedToken.expiresAt < new Date()) throw new UnauthorizedException('Refresh token has expired');

    const user = await this.userService.getUserByIdSudo(decodedToken?.userId);

    if (!user) throw new UnauthorizedException('User not found');
    if (user?.disabled) throw new UnauthorizedException('Account has been disabled');

    const newAccessToken = await this.generateJwtAccessToken(user);

    return {
      accessToken: newAccessToken,
    };
  }

  // Add method to logout
  async logout(refreshToken: string) {
    await this.refreshTokenModel.updateOne({ token: refreshToken }, { isRevoked: true, revokedAt: new Date() });
    return { success: true, message: 'Logged out successfully' };
  }

  // Add method to get user's active sessions
  async getUserActiveSessions(userId: string) {
    return await this.refreshTokenModel.find(
      {
        userId: new Types.ObjectId(userId),
        isRevoked: false,
        expiresAt: { $gt: new Date() },
      },
      { token: 0 },
    );
  }
}
