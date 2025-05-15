import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Email options interface
 */
interface EmailOptions {
  to: string | string[];
  subject: string;
  template: string;
  context?: any;
  attachments?: any[];
}

/**
 * Global email service
 * This service provides centralized email functionality
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly templates: Map<string, handlebars.TemplateDelegate>;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: this.configService.get('SMTP_PORT') === 465,
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASSWORD'),
      },
    });

    this.templates = new Map();
    this.loadTemplates();
  }

  /**
   * Load email templates
   */
  private loadTemplates(): void {
    const templatesDir = path.join(process.cwd(), 'src', 'templates', 'emails');
    const files = fs.readdirSync(templatesDir);

    files.forEach((file) => {
      if (file.endsWith('.hbs')) {
        const template = fs.readFileSync(
          path.join(templatesDir, file),
          'utf8',
        );
        const compiled = handlebars.compile(template);
        this.templates.set(file.replace('.hbs', ''), compiled);
      }
    });
  }

  /**
   * Send an email
   * @param options - The email options
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const template = this.templates.get(options.template);
      if (!template) {
        throw new Error(`Template ${options.template} not found`);
      }

      const html = template(options.context || {});
      const mailOptions = {
        from: this.configService.get('SMTP_FROM'),
        to: Array.isArray(options.to) ? options.to.join(',') : options.to,
        subject: options.subject,
        html,
        attachments: options.attachments,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent to ${options.to}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Send a welcome email
   * @param to - The recipient email
   * @param name - The recipient name
   */
  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Welcome to our platform',
      template: 'welcome',
      context: { name },
    });
  }

  /**
   * Send a password reset email
   * @param to - The recipient email
   * @param resetToken - The password reset token
   */
  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Password Reset Request',
      template: 'password-reset',
      context: { resetToken },
    });
  }

  /**
   * Send an email verification email
   * @param to - The recipient email
   * @param verificationToken - The email verification token
   */
  async sendEmailVerificationEmail(
    to: string,
    verificationToken: string,
  ): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Verify your email',
      template: 'email-verification',
      context: { verificationToken },
    });
  }

  /**
   * Send a notification email
   * @param to - The recipient email
   * @param subject - The email subject
   * @param message - The notification message
   */
  async sendNotificationEmail(
    to: string,
    subject: string,
    message: string,
  ): Promise<void> {
    await this.sendEmail({
      to,
      subject,
      template: 'notification',
      context: { message },
    });
  }

  /**
   * Send an invitation email
   * @param to - The recipient email
   * @param inviterName - The inviter's name
   * @param invitationLink - The invitation link
   */
  async sendInvitationEmail(
    to: string,
    inviterName: string,
    invitationLink: string,
  ): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'You have been invited',
      template: 'invitation',
      context: { inviterName, invitationLink },
    });
  }

  /**
   * Send a report email
   * @param to - The recipient email
   * @param reportName - The report name
   * @param reportData - The report data
   * @param attachments - The report attachments
   */
  async sendReportEmail(
    to: string,
    reportName: string,
    reportData: any,
    attachments?: any[],
  ): Promise<void> {
    await this.sendEmail({
      to,
      subject: `Report: ${reportName}`,
      template: 'report',
      context: { reportName, reportData },
      attachments,
    });
  }

  /**
   * Send a contact form email
   * @param to - The recipient email
   * @param name - The sender's name
   * @param email - The sender's email
   * @param message - The message
   */
  async sendContactFormEmail(
    to: string,
    name: string,
    email: string,
    message: string,
  ): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'New Contact Form Submission',
      template: 'contact-form',
      context: { name, email, message },
    });
  }

  /**
   * Send a feedback email
   * @param to - The recipient email
   * @param name - The sender's name
   * @param email - The sender's email
   * @param feedback - The feedback
   */
  async sendFeedbackEmail(
    to: string,
    name: string,
    email: string,
    feedback: string,
  ): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'New Feedback Submission',
      template: 'feedback',
      context: { name, email, feedback },
    });
  }

  /**
   * Send a support ticket email
   * @param to - The recipient email
   * @param ticketId - The ticket ID
   * @param subject - The ticket subject
   * @param message - The ticket message
   */
  async sendSupportTicketEmail(
    to: string,
    ticketId: string,
    subject: string,
    message: string,
  ): Promise<void> {
    await this.sendEmail({
      to,
      subject: `Support Ticket #${ticketId}`,
      template: 'support-ticket',
      context: { ticketId, subject, message },
    });
  }

  /**
   * Send a newsletter email
   * @param to - The recipient email
   * @param newsletter - The newsletter content
   */
  async sendNewsletterEmail(to: string, newsletter: any): Promise<void> {
    await this.sendEmail({
      to,
      subject: newsletter.subject,
      template: 'newsletter',
      context: { newsletter },
    });
  }

  /**
   * Send a marketing email
   * @param to - The recipient email
   * @param campaign - The marketing campaign
   */
  async sendMarketingEmail(to: string, campaign: any): Promise<void> {
    await this.sendEmail({
      to,
      subject: campaign.subject,
      template: 'marketing',
      context: { campaign },
    });
  }
} 