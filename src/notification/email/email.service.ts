import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: {
    filename: string;
    path?: string;
    content?: Buffer;
    contentType?: string;
  }[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private logger: Logger = new Logger('EmailService');

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: configService.get('EMAIL_SERVICE') || 'gmail',
      auth: {
        user: configService.get('EMAIL_USER'),
        pass: configService.get('EMAIL_PASSWORD'),
      },
    });
  }

  async sendEmail(options: EmailOptions) {
    try {
      if (this.transporter) {
        return await this.transporter.sendMail({
          from: `"${process.env.EMAIL_FROM_NAME || 'Influencer App'}" <${process.env.EMAIL_FROM_ADDRESS}>`,
          ...options,
        });
      }
      return null;
    } catch (error) {
      this.logger.error('Failed to send email:', error);
      return null;
    }
  }

  async sendOtp(email: string, otp: string) {
    return this.sendEmail({
      to: email,
      subject: 'Your verification code',
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Verification Code</h2>
      <p>Your verification code is:</p>
      <h1 style="font-size: 32px; letter-spacing: 5px; background-color: #f4f4f4; padding: 10px; text-align: center;">${otp}</h1>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this code, please ignore this email.</p>
      </div>
      `,
      text: `Your verification code is: ${otp}. This code will expire in 10 minutes. If you didn't request this code, please ignore this email.`,
    });
  }

  async sendCredentialsEmail(email: string, password: string) {
    return this.sendEmail({
      to: email,
      subject: 'Your Login Credentials',
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your Login Credentials</h2>
        <p>Hello,</p>
        <p>Your account has been created. Here are your login credentials:</p>
        <div style="background-color: #f4f4f4; padding: 15px; margin: 20px 0; border-left: 4px solid #4CAF50;">
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password:</strong> ${password}</p>
        </div>
        <p><strong>Important:</strong> Please log in and change your password immediately for security reasons.</p>
        <div style="margin: 30px 0;">
          <a href="#" 
             style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px;">
            Log In Now
          </a>
        </div>
        <p>If you have any questions, please contact our support team.</p>
        <p>Best regards,<br>The Influencer App Team</p>
      </div>
    `,
      text: `Your Login Credentials: Email: ${email}, Password: ${password}. Please log in and change your password immediately.`,
    });
  }
}
