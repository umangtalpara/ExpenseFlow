// 2. External libraries (npm packages)
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter | null = null;
  private readonly logger: Logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const secure = this.configService.get<boolean>('SMTP_SECURE') ?? false;

    if (!host || !user || !pass) {
      this.logger.warn('SMTP configuration is incomplete. Mail service will run in log-only mode.');
    } else {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure,
        auth: {
          user,
          pass,
        },
      });
    }
  }

  async sendMail(to: string, subject: string, html: string): Promise<void> {
    const from = this.configService.get<string>('SMTP_FROM') || 'noreply@expenseflow.com';

    if (!this.transporter) {
      this.logger.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
      this.logger.log(`Email successfully sent to ${to}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send email to ${to}: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to send email');
    }
  }

  async sendPasswordResetMail(email: string, token: string, frontendUrl?: string): Promise<void> {
    const baseUri = frontendUrl || 'http://localhost:3000';
    const resetUrl = `${baseUri}/reset-password?token=${token}`;
    const subject = 'Reset Your ExpenseFlow Password';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; margin-bottom: 16px;">Reset Password Request</h2>
        <p style="color: #475569; font-size: 16px; line-height: 24px;">
          You requested to reset your password for your ExpenseFlow account. Click the button below to set a new password:
        </p>
        <div style="margin: 24px 0; text-align: center;">
          <a href="${resetUrl}" style="background-color: #06b6d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #475569; font-size: 14px; line-height: 20px;">
          If the button doesn't work, you can copy and paste the following link into your browser:
        </p>
        <p style="color: #06b6d4; word-break: break-all; font-size: 14px;">
          ${resetUrl}
        </p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          This link will expire in 15 minutes. If you did not request this password reset, please ignore this email.
        </p>
      </div>
    `;
    await this.sendMail(email, subject, html);
  }
}
