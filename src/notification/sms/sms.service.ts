import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as twilio from 'twilio';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private client: twilio.Twilio;

  constructor(private readonly configService: ConfigService) {
    const sid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const token = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.client = twilio(sid, token);
  }

  async sendOtp(phoneNumber: string, otp: string): Promise<boolean> {
    const fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');

    try {
      await this.client.messages.create({
        body: `Your verification code is: ${otp}. This code will expire in 10 minutes.`,
        from: fromNumber,
        to: phoneNumber,
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to send SMS', error);
      return false;
    }
  }
}
