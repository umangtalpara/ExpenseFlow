import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('MailService', () => {
  let service: MailService;
  let mockConfigService: { get: jest.Mock };
  let mockTransporter: { sendMail: jest.Mock };

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'SMTP_HOST') return 'smtp.mailtrap.io';
        if (key === 'SMTP_PORT') return 2525;
        if (key === 'SMTP_USER') return 'user';
        if (key === 'SMTP_PASS') return 'pass';
        if (key === 'SMTP_SECURE') return false;
        if (key === 'SMTP_FROM') return 'noreply@expenseflow.com';
        return null;
      }),
    };

    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: '123' }),
    };

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send an email with correct options', async () => {
    await service.sendMail('test@example.com', 'Subject', '<p>Test</p>');

    expect(mockTransporter.sendMail).toHaveBeenCalledWith({
      from: 'noreply@expenseflow.com',
      to: 'test@example.com',
      subject: 'Subject',
      html: '<p>Test</p>',
    });
  });

  it('should send a password reset email', async () => {
    await service.sendPasswordResetMail('test@example.com', 'dummytoken', 'http://localhost:3000');

    expect(mockTransporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        subject: 'Reset Your ExpenseFlow Password',
        html: expect.stringContaining('http://localhost:3000/reset-password?token=dummytoken'),
      }),
    );
  });
});
